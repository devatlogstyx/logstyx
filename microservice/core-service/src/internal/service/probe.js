//@ts-check

const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, BEARER_PROBE_AUTH_TYPE, PROJECT_NOT_FOUND_ERR_MESSAGE, BASIC_PROBE_AUTH_TYPE, PROBESTYX_PROBE_AUTH_TYPE, NOT_FOUND_ERR_MESSAGE, PROBE_CACHE_KEY, INVALID_ID_ERR_MESSAGE, PROBE_NOT_FOUND_ERR_MESSAGE, NONE_PROBE_AUTH_TYPE, CUSTOM_PROBE_AUTH_TYPE, PROBE_LOG_CONTEXT_SOURCE, ERROR_LOG_LEVEL, INFO_LOG_LEVEL, SUBMIT_MESSAGE_QUEUE_AGENDA_JOB } = require("common/constant");
const { HttpError, compressAndEncrypt, sanitizeObject, decryptAndDecompress, num2Ceil, num2Floor, parseSortBy } = require("common/function");
const { Validator } = require("node-input-validator");
const { getProjectFromCache, updateProbeCache, getProbeFromCache } = require("../../shared/cache");
const probeModel = require("../model/probe.model");
const { mongoose, isValidObjectId } = require("./../../shared/mongoose");
const { default: striptags } = require("striptags");
const { submitRemoveCache, submitExecuteProbeWorker, submitCreateLog, submitCreateAgendaJob } = require("../../shared/provider/mq-producer");
const projectUserModel = require("../model/project.user.model");
const { ObjectId } = mongoose.Types
const axios = require("axios")

/**
 * 
 * @param {*} params 
 * @returns 
 */
const createProbe = async (params) => {
    const v = new Validator(params, {
        title: "required|string",
        project: "required|string",
        delay: "required|numeric|min:5|max:60",
        "connection.method": "required|string|in:GET,POST,PUT,PATCH,DELETE",
        "connection.url": "required|url",
        "connection.timeout": "numeric",
        "connection.auth.type": "required|string|in:NONE,BEARER,BASIC,HMAC,CUSTOM",
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    // Validate project exists
    const project = await getProjectFromCache(params.project);
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, PROJECT_NOT_FOUND_ERR_MESSAGE);
    }

    // Validate auth configuration based on type
    const authType = params?.connection?.auth?.type;
    if (authType === BEARER_PROBE_AUTH_TYPE && !params?.connection?.auth?.token) {
        throw HttpError(INVALID_INPUT_ERR_CODE, "Token is required for bearer auth");
    }

    if (authType === BASIC_PROBE_AUTH_TYPE && (!params?.connection?.auth?.username || !params?.connection?.auth?.password)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Username and password is required for basic auth`);
    }
    if (authType === PROBESTYX_PROBE_AUTH_TYPE && !params?.connection?.auth?.secret) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Secret is required for HMAC auth`);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Encrypt the connection object
        const connectionEncrypted = await compressAndEncrypt({
            method: params.connection.method || 'GET',
            url: params.connection.url,
            auth: params.connection.auth,
            timeout: params.connection.timeout || 10000,
            context: params.connection.context || {}
        });

        const payload = sanitizeObject({
            title: striptags(params.title),
            project: ObjectId.createFromHexString(params.project),
            delay: params.delay,
            connection: connectionEncrypted
        });

        const [probe] = await probeModel.create([payload], { session });

        await session.commitTransaction();

        submitExecuteProbeWorker({
            probeId: probe?._id?.toString(),
        })

        return updateProbeCache(probe?._id?.toString());

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession();
    }
};

/**
 * 
 * @param {string} id 
 */
const findProbeById = async (id) => {
    if (!isValidObjectId(id)) {
        return null
    }

    const probe = await getProbeFromCache(id)
    if (!probe) {
        return null
    }

    probe.connection = await decryptAndDecompress(probe.connection)

    return probe
}

/**
 * Update a probe
 * @param {string} id - Probe ID
 * @param {object} params - Update parameters
 * @param {string} [params.title]
 * @param {number} [params.delay]
 * @param {object} [params.connection]
 */
const updateProbe = async (id, params) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE);
    }

    const probe = await getProbeFromCache(id);
    if (!probe) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    }

    const v = new Validator(params, {
        title: "string",
        delay: "numeric|min:5|max:60",
        "connection.method": "string|in:GET,POST,PUT,PATCH,DELETE",
        "connection.url": "url",
        "connection.timeout": "numeric",
        "connection.auth.type": "string|in:NONE,BEARER,BASIC,HMAC,CUSTOM",
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    // Validate auth configuration if connection is being updated
    if (params.connection) {
        const authType = params?.connection?.auth?.type;
        if (authType === BEARER_PROBE_AUTH_TYPE && !params?.connection?.auth?.token) {
            throw HttpError(INVALID_INPUT_ERR_CODE, "Token is required for bearer auth");
        }
        if (authType === BASIC_PROBE_AUTH_TYPE && (!params?.connection?.auth?.username || !params?.connection?.auth?.password)) {
            throw HttpError(INVALID_INPUT_ERR_CODE, "Username and password is required for basic auth");
        }
        if (authType === PROBESTYX_PROBE_AUTH_TYPE && !params?.connection?.auth?.secret) {
            throw HttpError(INVALID_INPUT_ERR_CODE, "Secret is required for HMAC auth");
        }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const updateData = {};

        if (params.title) {
            updateData.title = striptags(params.title);
        }

        if (params.delay) {
            updateData.delay = params.delay;
        }

        if (params.connection) {
            // Encrypt the updated connection object
            updateData.connection = await compressAndEncrypt({
                method: params.connection.method || 'GET',
                url: params.connection.url,
                auth: params.connection.auth,
                timeout: params.connection.timeout || 10000,
                context: params.connection.context || {}
            });
        }

        await probeModel.findByIdAndUpdate(
            id,
            { $set: sanitizeObject(updateData) },
            { session }
        );

        await session.commitTransaction();

        return updateProbeCache(id);

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession();
    }
};

/**
 * Remove a probe
 * @param {string} id - Probe ID
 */
const removeProbe = async (id) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE);
    }

    const probe = await getProbeFromCache(id);
    if (!probe) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await probeModel.findByIdAndDelete(id, { session });

        await session.commitTransaction();

        submitRemoveCache({
            id,
            key: PROBE_CACHE_KEY
        })

        return null;

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession();
    }
};

/**
 * 
 * @param {*} params 
 * @returns 
 */
const buildProbeSearchQuery = (params = {}) => {
    let queryProbe = {};
    let queryUser = {};

    if (params.search) {
        queryProbe.$or = [
            {
                title: {
                    $regex: params?.search,
                    $options: "i"
                }
            }
        ];
    }

    if (params?.project) {
        queryProbe.project = ObjectId.createFromHexString(params?.project);
    }

    if (params?.user) {
        queryUser["user.userId"] = ObjectId.createFromHexString(params?.user);
    }

    return {
        queryUser,
        queryProbe
    };
};

const paginateProbe = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {
    const {
        queryUser,
        queryProbe
    } = buildProbeSearchQuery(query);

    limit = num2Ceil(num2Floor(limit, 1), 50);
    page = num2Floor(page, 1);
    const sort = parseSortBy(sortBy);

    const aggregate = projectUserModel.aggregate([
        { $match: queryUser }, // Filter by user first
        {
            $lookup: {
                from: "probes", // Join with probes collection
                localField: "project",
                foreignField: "project",
                as: "probes",
            },
        },
        { $unwind: "$probes" }, // Unwind probes array
        { $replaceRoot: { newRoot: "$probes" } }, // Replace root with probe
        { $match: queryProbe }, // Apply probe filters (search, project)
        {
            $lookup: {
                from: "projects", // Get project details
                localField: "project",
                foreignField: "_id",
                as: "projectData",
            },
        },
        { $unwind: "$projectData" },
        {
            $sort: {
                ...sort
            }
        }
    ]);

    let options = { page, limit };

    let res = await projectUserModel.aggregatePaginate(aggregate, options);

    let list = {
        results: res?.docs?.map((n) => {
            return {
                id: n?._id?.toString(),
                title: n?.title,
                project: {
                    id: n?.project?.toString(),
                    title: n?.projectData?.title,
                    slug: n?.projectData?.slug
                },
                delay: n?.delay,
                createdAt: n?.createdAt,
                updatedAt: n?.updatedAt
            };
        }),
        page,
        totalResults: res.total,
        totalPages: res.pages,
    };

    return list;
};

const crypto = require('crypto');
const { logger } = require("../../shared/logger");
const { generateLogKey, getLogModel, generateIndexedHashes, generateRawValues } = require("../utils/helper");
const { EXECUTE_PROBE_WORKER_MQ_QUEUE } = require("common/routes/mq-queue");

/**
 * Generate HMAC signature for Probestyx authentication
 * @param {string} secret 
 * @returns 
 */
const generateProbestyxAuth = (secret) => {
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(timestamp);
    const signature = hmac.digest('hex');

    return { timestamp, signature };
};

/**
 * Build auth headers based on connection auth type
 * 
 * @param {*} auth 
 * @returns 
 */
const buildAuthHeaders = (auth) => {
    const headers = {};

    switch (auth.type) {
        case NONE_PROBE_AUTH_TYPE:
            // No auth headers
            break;

        case BEARER_PROBE_AUTH_TYPE:
            headers['Authorization'] = `Bearer ${auth.token}`;
            break;

        case BASIC_PROBE_AUTH_TYPE:
            const encoded = Buffer
                .from(`${auth.username}:${auth.password}`)
                .toString('base64');
            headers['Authorization'] = `Basic ${encoded}`;
            break;

        case PROBESTYX_PROBE_AUTH_TYPE:
            const { timestamp, signature } = generateProbestyxAuth(auth.secret);
            headers['X-Timestamp'] = timestamp;
            headers['X-Signature'] = signature;
            break;

        case CUSTOM_PROBE_AUTH_TYPE:
            // Custom headers directly from auth config
            Object.assign(headers, auth.headers || {});
            break;
    }

    return headers;
};

/**
 * 
 * @param {*} project 
 * @param {*} params 
 */
const createProbesLog = async (project, params) => {
    let timestampDate = new Date(params?.timestamp)
    if (isNaN(timestampDate.getTime())) {
        timestampDate = new Date()
    }

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
 * Execute a single probe - fetch data and log it
 * 
 * @param {string} probeId 
 * @returns 
 */
const processExecuteProbeWorker = async (probeId) => {

    let probe
    const startTime = Date.now();
    
    try {
        probe = await findProbeById(probeId);
        if (!probe) {
            throw HttpError(NOT_FOUND_ERR_CODE, PROBE_NOT_FOUND_ERR_MESSAGE)
        }

        // Get probe with decrypted connection
        const { connection } = probe;
        const project = await getProjectFromCache(probe.project);
        if (!project) {
            throw HttpError(NOT_FOUND_ERR_CODE, PROJECT_NOT_FOUND_ERR_MESSAGE)
        }

        // Build auth headers
        const authHeaders = buildAuthHeaders(connection.auth);

        
        const response = await axios({
            url: connection.url,
            method: connection.method || 'GET',
            headers: {
                ...authHeaders,
                'User-Agent': 'Logstyx-Probe/1.0'
            },
            timeout: connection.timeout || 10000,
            validateStatus: (status) => status >= 200 && status < 300 // Only 2xx is success
        });

        const responseTime = Date.now() - startTime;

        // Axios automatically parses JSON
        let data = response.data;

        // For non-JSON responses, format the data
        const contentType = response.headers['content-type'];
        if (contentType && !contentType.includes('application/json')) {
            const text = typeof data === 'string' ? data : JSON.stringify(data);
            data = {
                response_body: text.substring(0, 1000),
                content_type: contentType,
                body_length: text.length
            };
        }

        // Log successful fetch
        await createProbesLog(project, {
            level: INFO_LOG_LEVEL,
            timestamp: Date.now(),
            device: {},
            context: {
                ...connection.context,
                url: probe.connection.url,
                source: PROBE_LOG_CONTEXT_SOURCE,
                probe_id: probeId,
                probe_title: probe.title,
                pull_success: true,
                status_code: response.status,
                response_time_ms: responseTime
            },
            data
        });

    } catch (e) {
        // Log failed fetch
        try {
            const probe = await findProbeById(probeId);
            if (probe) {
                const project = await getProjectFromCache(probe.project);

                // Extract error details from axios error
                const errorData = {
                    error: e.message,
                    error_type: e.name,
                    url: probe.connection.url
                };

                // If it's an axios error with response (like 403, 404, 500, etc.)
                if (e.response) {
                    errorData.status_code = e.response.status;
                    errorData.status_text = e.response.statusText;
                    errorData.response_time_ms = Date.now() - startTime;

                    // Optionally include response data
                    if (e.response.data) {
                        errorData.response_data = typeof e.response.data === 'string'
                            ? e.response.data.substring(0, 500)
                            : e.response.data;
                    }
                }

                await createProbesLog(project, {
                    level: ERROR_LOG_LEVEL,
                    timestamp: Date.now(),
                    device: {},
                    context: {
                        ...probe.connection.context,
                        url: probe.connection.url,
                        source: PROBE_LOG_CONTEXT_SOURCE,
                        probe_id: probeId,
                        probe_title: probe.title,
                        pull_success: false
                    },
                    data: errorData
                });
            }
        } catch (logError) {
            logger.error(logError)
        }

        logger.error(e)
    } finally {
        if (probe?.id) {
            setTimeout(() => {
                submitExecuteProbeWorker({
                    probeId: probe?.id
                })
            }, probe?.delay * 1000)
        }
    }
};

const startAllProbes = async () => {
    const probes = probeModel.find({}).cursor();

    for await (const probe of probes) {
        // Schedule immediate execution for each probe
        setTimeout(() => {
            submitExecuteProbeWorker({
                probeId: probe?._id?.toString()
            })
        }, probe?.delay * 1000)
    }
};

/**
 * 
 * @param {*} connection 
 */
const testConnection = async (connection) => {
    const authHeaders = buildAuthHeaders(connection.auth); const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), connection.timeout || 10000);

    const response = await fetch(connection.url, {
        method: connection.method || 'GET',
        headers: {
            ...authHeaders,
            'User-Agent': 'Logstyx-Probe/1.0'
        },
        signal: controller.signal
    });

    clearTimeout(timeout);

    // Parse response
    return response.json();

}

module.exports = {
    startAllProbes,
    createProbe,
    findProbeById,
    updateProbe,
    removeProbe,
    paginateProbe,
    processExecuteProbeWorker,
    testConnection
}
