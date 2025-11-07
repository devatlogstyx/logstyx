//@ts-check

const { mongoose } = require("./../../shared/mongoose");
const { getProjectFromCache } = require("../../shared/cache");
const { HttpError, hashString, decryptSecret, createSlug } = require("common/function");
const { NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, BROWSER_CLIENT_TYPE, INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE } = require("common/constant");
const { validateOrigin, validateSignature, getLogModel, generateIndexedHashes } = require("../utils/helper");
const projectModel = require("../model/project.model");
const { ObjectId } = mongoose.Types


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

    const { level, projectId, device, context, data, appid } = body
    const { deviceClientType, signature, origin } = headers

    const timestamp = headers?.timestamp

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
    let stringified = JSON.stringify({
        ...params?.device,
        ...params?.context,
        ...params?.data
    });

    const key = hashString(stringified)
    const { log, logstamp } = await getLogModel(project?.id)

    const hashes = generateIndexedHashes({
        context: params?.context,
        data: params?.data
    }, project);

    await log.findOneAndUpdate(
        { key },
        {
            $set: { updatedAt: new Date(params?.timestamp) },
            $inc: { count: 1 },
            $setOnInsert: {
                project: ObjectId.createFromHexString(project?.id),
                level: params?.level,
                device: params?.device,
                context: params?.context,
                data: params?.data,
                hash: hashes,
                createdAt: new Date(params?.timestamp)
            }
        },
        { upsert: true }
    );

    await logstamp.create(
        {
            project: ObjectId.createFromHexString(project?.id),
            key,
            level: params?.level,
            createdAt: new Date(params?.timestamp)
        },
    );
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
const processCreateLog = async (params) => {

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
 * @param {string} [params.search]
 * @param {*} project 
 * @returns 
 */
const buildLogsSearchQuery = (project, params = {}) => {
    let query = {

    }

    if (params.search) {
        // @ts-ignore
        query.$or = project?.settings?.indexes?.map((/** @type {string} */ fieldName) => {
            return {
                // @ts-ignore
                [fieldName]: hashString(params.search)
            }
        })
    }

    if (params?.level) {
        query.level = params?.level
    }

    return query
}

/**
 * 
 * @param {object} [query] 
 * @param {string} [query.project]
 * @param {string} [query.search]
 * @param {string} sortBy 
 * @param {number} limit 
 * @param {number} page 
 * @returns 
 */
const paginateLogs = async (query, sortBy = "createdAt:desc", limit = 10, page = 1) => {

    if (!query?.project) {
        throw HttpError(INVALID_INPUT_ERR_CODE, `Unknown Project`)
    }

    const project = await getProjectFromCache(query?.project)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, `Project Not Found`)
    }

    let queryParams = buildLogsSearchQuery(project, query)

    const { log: logModel } = await getLogModel(project?.id)

    const list = await logModel.paginate(queryParams, { sortBy, limit, page })
    list.results = list?.results?.map((n) => n?.toJSON())

    return list
}

/**
 * 
 * @param {string} projectId 
 * @param {string} key 
 */
const logTimeline = async (projectId, key) => {

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

module.exports = {
    processWriteLog,
    processCreateLog,
    paginateLogs,
    logTimeline
}