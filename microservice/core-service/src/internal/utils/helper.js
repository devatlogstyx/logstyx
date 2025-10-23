//@ts-check

const { INVALID_INPUT_ERR_CODE, INVALID_INPUT_ERR_MESSAGE, NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE } = require("common/constant");
const { HttpError, num2Int } = require("common/function");
const { default: striptags } = require("striptags")
const crypto = require("crypto")

/**
 * 
 * @param {string} field 
 * @returns 
 */
const validateCustomIndex = (field) => {
    return /^(context|data)\.[a-zA-Z_$][\w$]*$/.test(striptags(field));
}

/**
 * 
 * @param {object} project 
 * @param {string[]} project.allowedOrigin
 * @param {string} origin 
 */
const validateOrigin = (project, origin) => {

    if (!project?.allowedOrigin?.includes(origin)) {
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
        timestamp,
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

module.exports = {
    validateCustomIndex,
    validateOrigin,
    validateSignature
}