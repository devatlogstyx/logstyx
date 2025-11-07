//@ts-check

const { NO_ACCESS_ERR_CODE, NO_ACCESS_ERR_MESSAGE, NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE } = require("common/constant");
const { HttpError, num2Int, getNestedValue, hashString } = require("common/function");
const { default: striptags } = require("striptags")
const crypto = require("crypto");
const logSchema = require("../model/log.model");
const { mongoose } = require("./../../shared/mongoose");
const logstampSchema = require("../model/logstamp.model");
const { getProjectFromCache } = require("../../shared/cache");

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
 * @param {number} project.settings.retentionDays 
 */
const initLogger = async (project) => {
    const logModelName = `Log_${project.id}`;
    const logStampModelName = `Logstamp_${project.id}`;

    // Delete existing models so we can recreate with new schema
    if (mongoose.models[logModelName]) {
        delete mongoose.models[logModelName];
        delete mongoose.connection.models[logModelName];
    }
    if (mongoose.models[logStampModelName]) {
        delete mongoose.models[logStampModelName];
        delete mongoose.connection.models[logStampModelName];
    }

    // Create fresh schemas with CURRENT project settings
    const schema = logSchema.clone();
    const stampSchema = logstampSchema.clone();

    for (const field of project.settings.indexes) {
        const hashField = `hash.${field.replace(/\./g, '_')}`;
        schema.index({ [hashField]: 1 });
    }

    if (project.settings.retentionDays) {
        schema.index(
            { createdAt: 1 },
            { expireAfterSeconds: project.settings.retentionDays * 24 * 60 * 60 }
        );
    }

    if (project.settings.retentionDays) {
        stampSchema.set('expireAfterSeconds',
            project.settings.retentionDays * 24 * 60 * 60
        );
    }

    // Create models with NEW schema
    const logModel = mongoose.model(logModelName, schema, `logs_${project.id}`);
    const logStampModel = mongoose.model(logStampModelName, stampSchema, `logstamps_${project.id}`);

    // Sync indexes: creates new ones, drops old ones
    await logModel.syncIndexes();
    await logStampModel.syncIndexes();

    // Update Registry with new models
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
        mongoose.model(logModelName, logSchema.clone(), `logs_${project.id}`);

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
 * @param {number} date 
 * @param {number} thresholdHours 
 * @returns 
 */
function isRecent(date, thresholdHours = 24) {
    const hoursSince = (new Date() - date) / (1000 * 60 * 60);
    return hoursSince < thresholdHours;
}


module.exports = {
    validateCustomIndex,
    validateOrigin,
    validateSignature,
    initLogger,
    getLogModel,
    generateIndexedHashes,
    isRecent
}