//@ts-check

const { mongoose } = require("./../../shared/mongoose");
const { getProjectFromCache } = require("../../shared/cache");
const { HttpError, hashString } = require("common/function");
const { NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, BROWSER_CLIENT_TYPE, INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE } = require("common/constant");
const { validateOrigin, validateSignature, getLogModel, generateIndexedHashes } = require("../utils/helper");
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

    let params = JSON.stringify({
        ...device,
        ...context,
        ...data
    });

    const key = hashString(params)
    const { log, logstamp } = await getLogModel(projectId)

    const hashes = generateIndexedHashes({
        context,
        data
    }, project);

    await log.findOneAndUpdate(
        { key },
        {
            $set: { updatedAt: new Date() },
            $inc: { occurrenceCount: 1 },
            $setOnInsert: {
                project: ObjectId.createFromHexString(projectId),
                level,
                device,
                context,
                data,
                hash: hashes,
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
    processWriteLog
}