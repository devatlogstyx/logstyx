//@ts-check

const { mongoose, isValidObjectId } = require("./../../shared/mongoose");
const { getProjectFromCache } = require("../../shared/cache");
const { HttpError, hashString, decryptSecret, createSlug, encrypt, decrypt } = require("common/function");
const { NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, BROWSER_CLIENT_TYPE, INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE, INVALID_ID_ERR_MESSAGE } = require("common/constant");
const { validateOrigin, validateSignature, generateIndexedHashes, validateCustomIndex, generateRawValues, generateLogKey } = require("../utils/helper");
const projectModel = require("../model/project.model");
const { mapLog } = require("../utils/mapper");
const { compressAndEncrypt, decryptAndDecompress } = require("common/function");
const logSchema = require("../model/log.model");
const logstampSchema = require("../model/logstamp.model");
const { submitProcessLogAlert } = require("../../shared/provider/mq-producer");

const Registry = {};

/**
 * 
 * @param {object} project 
 * @param {string} project.id 
 * @param {object} project.settings
 * @param {string[]} project.settings.indexes
 * @param {string[]} project.settings.rawIndexes
 * @param {number} project.settings.retentionHours 
 */
const initLogger = async (project) => {
    if (!isValidObjectId(project.id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const logModelName = `Log_${project.id}`;
    const logStampModelName = `Logstamp_${project.id}`;

    // Delete existing models
    if (mongoose.models[logModelName]) {
        delete mongoose.models[logModelName];
        delete mongoose.connection.models[logModelName];
    }
    if (mongoose.models[logStampModelName]) {
        delete mongoose.models[logStampModelName];
        delete mongoose.connection.models[logStampModelName];
    }

    // === LOG COLLECTION ===
    const schema = logSchema.clone();

    // Clear any existing createdAt indexes from schema
    schema._indexes = schema._indexes.filter(idx => {
        const fields = Object.keys(idx[0]);
        return !fields.includes('createdAt') && !fields.includes('updatedAt');
    });

    // Add custom indexes
    for (const field of project.settings.indexes) {
        const hashField = `hash.${field.replace(/\./g, '_')}`;
        schema.index({ [hashField]: 1 });
    }

    // Add raw indexes (non-hashed, good for numbers)
    if (project.settings.rawIndexes) {
        for (const field of project.settings.rawIndexes) {
            const rawField = `raw.${field.replace(/\./g, '_')}`;
            schema.index({ [rawField]: 1 });
        }
    }

    // Add TTL index
    const retentionHours = project.settings.retentionHours;
    if (retentionHours && retentionHours > 0) {
        schema.index(
            { updatedAt: 1 },  // ← Changed from createdAt
            {
                expireAfterSeconds: retentionHours * 60 * 60,
                name: 'updatedAt_ttl'
            }
        );
    }


    const logModel = mongoose.model(logModelName, schema, `log_${project.id}`);

    // Drop the problematic index specifically
    try {
        const existingIndexes = await logModel.collection.indexes();

        for (const idx of existingIndexes) {
            if ((idx.name.includes('createdAt') || idx.name.includes('updatedAt'))
                && idx.name !== 'updatedAt_ttl') {
                await logModel.collection.dropIndex(idx.name);
            }
        }
    } catch (e) {
        // Ignore
    }

    await logModel.syncIndexes();

    // === TIMESERIES COLLECTION ===
    const collectionName = `logstamp_${project.id}`;

    try {
        const collections = await mongoose.connection.db
            .listCollections({ name: collectionName })
            .toArray();

        const collectionExists = collections.length > 0;
        const desiredTTL = retentionHours ? retentionHours * 60 * 60 : null;

        if (collectionExists) {
            // Collection exists - check if TTL matches
            const collInfo = collections[0];
            const currentTTL = collInfo?.options?.expireAfterSeconds;

            // If TTL is different, update it without dropping the data
            if (currentTTL !== desiredTTL) {
                await mongoose.connection.db.command({
                    collMod: collectionName,
                    expireAfterSeconds: desiredTTL
                });
            }
        } else {
            // Collection doesn't exist - create it for the first time
            const createOptions = {
                timeseries: {
                    timeField: 'createdAt',
                    metaField: 'level',
                    granularity: 'seconds'
                }
            };

            if (desiredTTL) {
                createOptions.expireAfterSeconds = desiredTTL;
            }

            await mongoose.connection.db.createCollection(collectionName, createOptions);
        }
    } catch (e) {
        console.error(`Failed to sync timeseries for ${collectionName}:`, e.message);
        throw e;
    }

    // Create Mongoose model
    const stampSchema = logstampSchema.clone();
    delete stampSchema.options.timeseries;

    const logStampModel = mongoose.model(logStampModelName, stampSchema, collectionName);

    try {
        await logStampModel.syncIndexes();
    } catch (e) {
        console.log('Note: Could not sync indexes on timeseries:', e.message);
    }

    Registry[project.id] = {
        log: logModel,
        logstamp: logStampModel
    };

    return null;
}
/**
 * 
 * @param {string} projectId 
 * @returns 
 */
const getLogModel = async (projectId) => {
    if (!isValidObjectId(projectId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    // Check in-memory registry first
    if (Registry[projectId]) return Registry[projectId];

    const project = await getProjectFromCache(projectId)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const logModelName = `Log_${project.id}`;
    const logStampModelName = `Logstamp_${project.id}`;

    // Check if models already exist in Mongoose, otherwise create them
    const logModel = mongoose.models[logModelName] ||
        mongoose.model(logModelName, logSchema.clone(), `log_${project.id}`);

    const logStampModel = mongoose.models[logStampModelName] ||
        mongoose.model(logStampModelName, logstampSchema.clone(), `logstamp_${project.id}`);

    // Cache in registry
    Registry[project.id] = {
        log: logModel,
        logstamp: logStampModel
    };

    return {
        log: logModel,
        logstamp: logStampModel
    };
}


/**
 * 
 * @param {object} param0
 * @param {object} param0.headers
 * @param {string} param0.headers.signature
 * @param {string} param0.headers.deviceClientType
 * @param {string} param0.headers.origin
 * @param {string | number | Date} [param0.headers.timestamp]
 * @param {object} param0.body
 * @param {string} param0.body.level
 * @param {string} param0.body.projectId
 * @param {object} param0.body.device
 * @param {object} param0.body.context
 * @param {object} param0.body.data
 * @param {string} param0.body.appid
 * @param {string | number | Date} [param0.body.timestamp]
 * 
 * @returns 
 */
const processWriteLog = async ({ headers, body }) => {

    const { level, projectId, device, context, data, appid } = body ?? {}
    const { deviceClientType, signature, origin } = headers ?? {}

    const timestamp = headers?.timestamp || new Date()

    const project = await getProjectFromCache(projectId)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    if (deviceClientType == BROWSER_CLIENT_TYPE) {
        validateOrigin(project, origin)
    } else if (appid) {
        validateOrigin(project, appid)
    } else if (signature) {
        validateSignature(project, headers, body)
    } else {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE)
    }

    await createLog(project, {
        level,
        device,
        context,
        data,
        timestamp
    })

    return null
}

/**
 * 
 * @param {object} project 
 * @param {string} project.id
 * @param {object} params 
 * @param {object} params.device
 * @param {object} params.context
 * @param {object} params.data
 * @param {string} params.level
 * @param {string|number|Date} params.timestamp
 */
const createLog = async (project, params) => {
    if (!isValidObjectId(project?.id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    let timestampDate = new Date(params?.timestamp)
    if (isNaN(timestampDate.getTime())) {
        timestampDate = new Date()
    }

    submitProcessLogAlert({
        projectId: project?.id,
        params
    })?.catch(console.error)

    const key = generateLogKey(params, project)

    const { log, logstamp } = await getLogModel(project?.id)

    const hashes = generateIndexedHashes({
        context: params?.context,
        data: params?.data
    }, project);

    // Generate raw values for rawIndexes
    const rawValues = generateRawValues({
        context: params?.context,
        data: params?.data
    }, project);

    const [compressedContext, compressedData] = await Promise.all([
        compressAndEncrypt(params?.context),
        compressAndEncrypt(params?.data)
    ])

    await log.findOneAndUpdate(
        { key },
        {
            $set: { updatedAt: timestampDate },
            $inc: { count: 1 },
            $setOnInsert: {
                level: params?.level,
                device: params?.device,
                context: compressedContext,
                data: compressedData,
                hash: hashes,
                raw: rawValues,
                createdAt: timestampDate,
            }
        },
        { upsert: true }
    );

    await logstamp.create({
        key,
        level: params?.level,
        createdAt: timestampDate
    });
}

/**
 * 
 * @param {object} params 
 * @param {object} params.device
 * @param {object} params.context
 * @param {object} params.data
 * @param {string} params.level
 * @param {string|number|Date} params.timestamp
 * @returns 
 */
const processCreateSelfLog = async (params) => {

    // @ts-ignore
    const projectTitle = decryptSecret(process?.env?.ENC_SELF_PROJECT_TITLE)
    if (!projectTitle) {
        console.warn('Self-logging not configured (ENC_SELF_PROJECT_TITLE not set)');
        return null
    }

    const projectSlug = createSlug(projectTitle || "")
    if (!projectSlug) {
        console.error('Failed to create slug from project title:', projectTitle);
        return null
    }

    const project = await projectModel.findOne({
        slug: projectSlug
    })

    if (!project) {
        console.error(`Self-project not found: ${projectSlug}`);
        console.log('Hint: Run setup to create self-project');
        return null
    }

    await createLog(project?.toJSON(), params)?.catch(console.error)

    return null

}

/**
 * 
 * @param {object} [params] 
 * @param {string[]} [params.filterFields]
 * @param {string[]} [params.filterValues]
 * @param {string[]} [params.filterOperators]
 * @param {object} [project] 
 * @returns 
 */
const buildLogsSearchQuery = (params = {}, project) => {
    let query = {}

    if (params.filterFields && params.filterValues &&
        params.filterFields.length > 0 &&
        params.filterFields.length === params.filterValues.length) {

        params.filterFields.forEach((field, index) => {
            const value = params?.filterValues?.[index]
            const operator = params?.filterOperators?.[index] || 'eq' // Default to equals

            if (field && value !== undefined && value !== null) {

                // Check if field is in rawIndexes
                if (project?.settings?.rawIndexes?.includes(field)) {
                    const safeFieldName = field.replace(/\./g, '_')
                    const queryField = `raw.${safeFieldName}`

                    // Support range operators for numeric fields
                    switch (operator) {
                        case 'gt':
                            query[queryField] = { $gt: Number(value) }
                            break
                        case 'gte':
                            query[queryField] = { $gte: Number(value) }
                            break
                        case 'lt':
                            query[queryField] = { $lt: Number(value) }
                            break
                        case 'lte':
                            query[queryField] = { $lte: Number(value) }
                            break
                        case 'eq':
                        default:
                            query[queryField] = Number(value)
                    }

                } else if (validateCustomIndex(field)) {
                    // Hashed fields only support exact match
                    query[`hash.${field.replace(/\./g, '_')}`] = hashString(
                        String(value),
                        field
                    )
                } else {
                    // Regular fields
                    query[field] = value
                }
            }
        })
    }

    return query
}


/**
 * 
 * @param {object} [query] 
 * @param {string} [query.project]
 * @param {string} [query.filterField]
 * @param {string} [query.filterValue]
 * @param {string} sortBy 
 * @param {number} limit 
 * @param {number} page 
 * @returns 
 */
const paginateLogs = async (query, sortBy = "updatedAt:desc", limit = 10, page = 1) => {

    if (isValidObjectId(query?.project)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const project = await getProjectFromCache(query?.project)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, `Project Not Found`)
    }

    let queryParams = buildLogsSearchQuery(query, project)

    const { log: logModel } = await getLogModel(project?.id)

    const list = await logModel.paginate(queryParams, { sortBy, limit, page })
    list.results = await Promise.all(list?.results?.map(mapLog)) // Changed this line

    return list
}

/**
 * 
 * @param {string} projectId 
 * @param {string} key 
 */
const logTimeline = async (projectId, key) => {

    if (!isValidObjectId(projectId)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const { logstamp } = await getLogModel(projectId)

    const hourlyStats = await logstamp.aggregate([
        {
            $match: {
                key,
                createdAt: {
                    $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) // Last 24 hours
                }
            }
        },
        {
            $group: {
                _id: { $dateTrunc: { date: "$createdAt", unit: "hour" } },
                count: { $sum: 1 }
            }
        },
        {
            $sort: { "_id": -1 }
        },
        {
            $project: {
                _id: 0,
                datetime: "$_id",
                count: 1
            }
        }
    ]);

    return hourlyStats
}

/**
 * 
 * @param {string} projectId 
 * @param {*} field 
 * @returns 
 */
const getDistinctValue = async (projectId, field) => {
    if (!isValidObjectId(projectId)) {
        return null
    }

    const { log } = await getLogModel(projectId);
    let distinctValues = [];

    if (validateCustomIndex(field)) {
        const hashField = `hash.${field.replace(/\./g, '_')}`;
        const [fieldType, fieldName] = field.split('.'); // 'context' or 'data', and the field name

        // Aggregate to get unique hash values with their encrypted context/data 
        const results = await log.aggregate([
            {
                $group: {
                    _id: `$${hashField}`,
                    encrypted: { $first: `$${fieldType}` },
                }
            },
            { $limit: 999 }
        ]);

        // Decrypt and extract the field values
        distinctValues = await Promise.all(
            results.map(async result => {
                if (result.encrypted) {
                    try {
                        const decrypted = await decryptAndDecompress(result.encrypted);
                        return decrypted[fieldName];
                    } catch (err) {
                        console.error('Decryption error:', err);
                        return null;
                    }
                }
                return null;
            })
        );

        // Filter out null values from the results
        distinctValues = distinctValues.filter(Boolean);

    } else {
        // Regular field
        distinctValues = await log.distinct(field);
    }

    const filtered = distinctValues
        .filter(Boolean)
        .slice(0, 999);

    return filtered;
}

module.exports = {
    createLog,
    processWriteLog,
    processCreateSelfLog,
    paginateLogs,
    logTimeline,
    getDistinctValue,
    initLogger,
    getLogModel
}