//@ts-check

const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, BEARER_PROBE_AUTH_TYPE, PROJECT_NOT_FOUND_ERR_MESSAGE, BASIC_PROBE_AUTH_TYPE, PROBESTYX_PROBE_AUTH_TYPE, NOT_FOUND_ERR_MESSAGE, PROBE_CACHE_KEY, INVALID_ID_ERR_MESSAGE, PROBE_NOT_FOUND_ERR_MESSAGE, NONE_PROBE_AUTH_TYPE, CUSTOM_PROBE_AUTH_TYPE, PROBE_LOG_CONTEXT_SOURCE, ERROR_LOG_LEVEL, INFO_LOG_LEVEL, SUBMIT_MESSAGE_QUEUE_AGENDA_JOB, HMAC_PROBE_AUTH_TYPE } = require("common/constant");
const { HttpError, compressAndEncrypt, sanitizeObject, decryptAndDecompress, num2Ceil, num2Floor, parseSortBy } = require("common/function");
const { Validator } = require("node-input-validator");
const { getProjectFromCache, updateProbeCache, getProbeFromCache } = require("../../shared/cache");
const { mongoose, isValidObjectId } = require("./../../shared/mongoose");
const { default: striptags } = require("striptags");
const { submitRemoveCache, submitExecuteProbeWorker, submitCreateLog, submitCreateAgendaJob } = require("../../shared/provider/mq-producer");
const { Probes, ProjectUsers } = require("../model");
const { buildProbeSearchQuery, buildAuthHeaders } = require("../factory/probe");
const { ObjectId } = mongoose.Types
const axios = require("axios")
const allowedAuthType = [NONE_PROBE_AUTH_TYPE, BEARER_PROBE_AUTH_TYPE, BASIC_PROBE_AUTH_TYPE, PROBESTYX_PROBE_AUTH_TYPE, CUSTOM_PROBE_AUTH_TYPE]
const { logger } = require("../../shared/logger");

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
        "connection.auth.type": "required|string|in:" + allowedAuthType?.join(","),
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

        const probe = await Probes.create(payload, session);

        await session.commitTransaction();

        submitExecuteProbeWorker({
            probeId: probe?.id,
        })

        return updateProbeCache(probe?.id);

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
        "connection.auth.type": "string|in:" + allowedAuthType.join(","),
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

        await Probes.findByIdAndUpdate(
            id,
            { $set: sanitizeObject(updateData) },
            session
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
        await Probes.findByIdAndDelete(id, session);

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

const paginateProbe = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {
    const {
        queryUser,
        queryProbe
    } = buildProbeSearchQuery(query);

    limit = num2Ceil(num2Floor(limit, 1), 50);
    page = num2Floor(page, 1);
    const sort = parseSortBy(sortBy);

    let options = { page, limit };

    let res = await ProjectUsers.aggregatePaginate([
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
    ], options);

    let list = {
        results: await Promise.all(res?.docs?.map(async (n) => {
            const connection = await decryptAndDecompress(n.connection)
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
                updatedAt: n?.updatedAt,
                connection: {
                    url: connection?.url,
                    auth: {
                        type: connection?.auth?.type || NONE_PROBE_AUTH_TYPE
                    }
                }
            };
        })),
        page,
        totalResults: res.total,
        totalPages: res.pages,
    };

    return list;
};

/**
 * Execute a single probe - fetch data and log it
 * 
 * @param {string} probeId 
 * @returns 
 */
const processExecuteProbeWorker = async (probeId, createLogFunc) => {

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
        await createLogFunc(project, {
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

                await createLogFunc(project, {
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
    const probes = Probes.cursor({});

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

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (contentType.includes('application/json')) {
        try {
            return JSON.parse(text);
        } catch (e) {
            // fall through to raw text response below
        }
    }

    return {
        status_code: response.status,
        content_type: contentType,
        response_body: text.substring(0, 1000),
        body_length: text.length
    };

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
