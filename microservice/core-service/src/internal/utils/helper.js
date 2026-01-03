//@ts-check

const { NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE, NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, FULL_PAYLOAD_DEDUPLICATION_STRATEGY, NONE_DEDUPLICATION_STRATEGY, INDEX_ONLY_DEDUPLICATION_STRATEGY } = require("common/constant");
const { HttpError, num2Int, getNestedValue, hashString } = require("common/function");
const { default: striptags } = require("striptags")
const crypto = require("crypto");
const logSchema = require("../model/log.model");
const { mongoose, isValidObjectId } = require("./../../shared/mongoose");
const logstampSchema = require("../model/logstamp.model");
const { getProjectFromCache } = require("../../shared/cache");
const projectUserModel = require("../model/project.user.model");
const { ObjectId } = mongoose.Types

/**
 * 
 * @param {string} field 
 * @returns 
 */
const validateCustomIndex = (field, maxDepth = 5) => {
    const cleaned = striptags(field);

    // Must start with context or data
    if (!/^(context|data)\./.test(cleaned)) {
        return false;
    }

    // Check valid identifier pattern
    if (!/^(context|data)(\.[a-zA-Z_$][\w$]*)+$/.test(cleaned)) {
        return false;
    }

    // Limit depth (prevent data.a.b.c.d.e.f.g.h.i.j...)
    const depth = cleaned.split('.').length - 1; // -1 because first is context/data
    if (depth > maxDepth) {
        return false;
    }

    return true;
}


/**
 * 
 * @param {object} project 
 * @param {object} project.settings
 * @param {string[]} project.settings.allowedOrigin
 * @param {string} origin 
 */
const validateOrigin = (project, origin) => {

    if (!project?.settings?.allowedOrigin?.includes(origin)) {
        throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    return true

}

/**
 * 
 * @param {*} project 
 * @param {*} headers 
 * @param {*} body 
 */
const validateSignature = (project, headers, body) => {
    const { level, projectId, device, context, data } = body

    const { timestamp, signature } = headers;

    const payload = {
        level,
        projectId,
        device,
        context,
        data
    };

    let params = JSON.stringify(payload);
    const Hash = projectId + params + num2Int(timestamp);

    const serverSignature = crypto
        .createHmac(`SHA256`, project?.secret)
        .update(Hash)
        .digest("hex")
        .toUpperCase();

    if (serverSignature !== signature) {
        throw HttpError(NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE)
    }

    return true
}


const Registry = {};

/**
 * 
 * @param {object} project 
 * @param {string} project.id 
 * @param {object} project.settings
 * @param {string[]} project.settings.indexes
 * @param {string[]} project.settings.rawIndexes
 * @param {number} project.settings.retentionDays 
 */
const initLogger = async (project) => {
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
    const retentionDays = project.settings.retentionDays;
    if (retentionDays && retentionDays > 0) {
        schema.index(
            { updatedAt: 1 },  // ← Changed from createdAt
            {
                expireAfterSeconds: retentionDays * 24 * 60 * 60,
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
        // Check if collection exists
        const collections = await mongoose.connection.db
            .listCollections({ name: collectionName })
            .toArray();

        const collectionExists = collections.length > 0;

        if (collectionExists) {
            // Collection exists - check if TTL matches
            const collInfo = collections[0];
            const currentTTL = collInfo?.options?.expireAfterSeconds;
            const desiredTTL = retentionDays ? retentionDays * 24 * 60 * 60 : null;

            //drop if ttl ttl mismatched
            if (currentTTL !== desiredTTL) {

                await mongoose.connection.db.dropCollection(collectionName);

                // Create with new TTL
                const createOptions = {
                    timeseries: {
                        timeField: 'createdAt',
                        metaField: 'level',
                        granularity: 'seconds'
                    }
                };

                if (retentionDays && retentionDays > 0) {
                    createOptions.expireAfterSeconds = retentionDays * 24 * 60 * 60;
                }

                await mongoose.connection.db.createCollection(collectionName, createOptions);
            }
        } else {
            // Collection doesn't exist - create it
            const createOptions = {
                timeseries: {
                    timeField: 'createdAt',
                    metaField: 'level',
                    granularity: 'seconds'
                }
            };

            if (retentionDays && retentionDays > 0) {
                createOptions.expireAfterSeconds = retentionDays * 24 * 60 * 60;
            }

            await mongoose.connection.db.createCollection(collectionName, createOptions);
        }
    } catch (e) {
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
 * @param {*} log 
 * @param {*} project 
 * @returns 
 */
const generateIndexedHashes = (log, project) => {
    const hashes = {};

    // Loop through project's indexed fields
    for (const fieldPath of project.settings.indexes) {
        // Extract value from log (context.userId, data.errorMessage, etc.)
        const value = getNestedValue(log, fieldPath);

        // Only hash if value exists
        if (value !== undefined && value !== null) {
            // Convert field path to hash key: "context.userId" -> "context_userId"
            const hashKey = fieldPath.replace(/\./g, '_');

            // Hash with salt (project + field for isolation)
            // @ts-ignore
            hashes[hashKey] = hashString(
                String(value),
                fieldPath
            );
        }
    }

    return hashes;
}

/**
 * 
 * @param {*} data 
 * @param {*} project 
 * @returns 
 */
const generateRawValues = (data, project) => {
    if (!project?.settings?.rawIndexes || project.settings.rawIndexes.length === 0) {
        return {};
    }

    const rawValues = {};
    const flatData = { ...data.context, ...data.data };

    for (const field of project.settings.rawIndexes) {
        const value = getNestedValue(flatData, field);

        if (value !== undefined && value !== null) {
            const safeFieldName = field.replace(/\./g, '_');
            rawValues[safeFieldName] = value;  // Store as-is, no hashing
        }
    }

    return rawValues;
};


/**
 * 
 * @param {number} date 
 * @param {number} thresholdHours 
 * @returns 
 */
function isRecent(date, thresholdHours = 24) {
    const hoursSince = (new Date() - date) / (1000 * 60 * 60);
    return hoursSince < thresholdHours;
}

/**
 * 
 * @param {*} params 
 * @param {*} project 
 * @returns 
 */
const generateLogKey = (params, project) => {
    const strategy = project?.settings?.deduplicationStrategy || FULL_PAYLOAD_DEDUPLICATION_STRATEGY;

    switch (strategy) {
        case NONE_DEDUPLICATION_STRATEGY: {
            // Every log is unique - generate random key
            // Use timestamp + random to ensure uniqueness
            return hashString(
                `${Date.now()}_${Math.random()}_${JSON.stringify(params)}`
            );
        }

        case INDEX_ONLY_DEDUPLICATION_STRATEGY: {
            // Hash only level + indexed fields
            const keyData = {
                level: params?.level,
            };

            // Extract values from indexed fields
            const indexes = project?.settings?.indexes || [];
            for (const fieldPath of indexes) {
                const value = getNestedValue({
                    context: params?.context,
                    data: params?.data
                }, fieldPath);

                if (value !== undefined && value !== null) {
                    // Use fieldPath as key to maintain structure
                    keyData[fieldPath] = value;
                }
            }

            return hashString(JSON.stringify(keyData));
        }

        case FULL_PAYLOAD_DEDUPLICATION_STRATEGY:
        default: {
            // Hash everything (level, device, context, data)
            const fullPayload = {
                level: params?.level,
                ...params?.device,
                ...params?.context,
                ...params?.data
            };

            return hashString(JSON.stringify(fullPayload));
        }
    }
};

/**
 * 
 * @param {string} userId 
 * @param {string} projectId 
 * @returns 
 */
const canUserAccessProject = async (userId, projectId) => {
    if (!isValidObjectId(userId) || !isValidObjectId(projectId)) {
        return false
    }

    const access = await projectUserModel.findOne({
        project: ObjectId.createFromHexString(projectId),
        "user.userId": ObjectId.createFromHexString(userId)
    });

    return !!access;
};



module.exports = {
    validateCustomIndex,
    validateOrigin,
    validateSignature,
    initLogger,
    getLogModel,
    generateIndexedHashes,
    isRecent,
    generateRawValues,
    generateLogKey,
    canUserAccessProject
}