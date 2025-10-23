//@ts-check

const logSchema = require("./../model/log.model");
const logstampSchema = require("./../model/logstamp.model");
const { mongoose } = require("./../../shared/mongoose");
const { getProjectFromCache } = require("../../shared/cache");
const { HttpError, hashString } = require("common/function");
const { NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, BROWSER_CLIENT_TYPE, INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE } = require("common/constant");
const { validateOrigin, validateSignature } = require("../utils/helper");
const { ObjectId } = mongoose.Types

const Registry = {};

/**
 * 
 * @param {object} project 
 * @param {string} project.id 
 * @param {string[]} project.indexes 
 */
const initLogger = (project) => {
    const schema = logSchema.clone();
    for (const field of project.indexes) {
        schema.index({ [field]: 1 });
    }

    const logModel = mongoose.model(`Log_${project?.id}`, schema, `logs_${project?.id}`);
    const logStampModel = mongoose.model(`Logstamp_${project?.id}`, logstampSchema.clone(), `logstamp_${project?.id}`);


    // @ts-ignore
    Registry[project?.id] = {
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
    // @ts-ignore
    if (Registry[projectId]) return Registry[projectId];

    const project = await getProjectFromCache(projectId)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const schema = logSchema.clone();
    const logModel = mongoose.model(`Log_${project?.id}`, schema, `logs_${project?.id}`);
    const logStampModel = mongoose.model(`Logstamp_${project?.id}`, logstampSchema.clone(), `logstamp_${project?.id}`);

    // @ts-ignore
    Registry[project?.id] = {
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

    const { level, projectId, device, context, data, appid } = body
    const { deviceClientType, signature, origin } = headers

    const timestamp = headers?.timestamp || body?.timestamp

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


    const key = hashString(JSON.stringify({
        ...device,
        ...context,
        ...data
    }))

    const { log, logstamp } = await getLogModel(projectId)

    await log.findOneAndUpdate(
        { key },
        {
            $set: { updatedAt: new Date() },
            $setOnInsert: {
                project: ObjectId.createFromHexString(projectId),
                level,
                device,
                context,
                data,
                createdAt: new Date(timestamp)
            }
        },
        { upsert: true }
    );

    await logstamp.create(
        {
            project: ObjectId.createFromHexString(projectId),
            key,
            level,
            createdAt: new Date(timestamp)
        },
    );


    return null
}

module.exports = {
    initLogger,
    getLogModel,
    processWriteLog
}