//@ts-check

const logSchema = require("./../model/log.model");
const { mongoose } = require("./../../shared/mongoose");
const { getProjectFromCache } = require("../../shared/cache");
const { HttpError } = require("common/function");
const { NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE } = require("common/constant");

const registry = {};

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

    const model = mongoose.model(`Log_${project?.id}`, schema, `logs_${project?.id}`);
    // @ts-ignore
    registry[project?.id] = model;
    return model;

}

/**
 * 
 * @param {string} projectId 
 * @returns 
 */
const getLogModel = async (projectId) => {
    // @ts-ignore
    if (registry[projectId]) return registry[projectId];

    const project = await getProjectFromCache(projectId)
    if (!project) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const schema = logSchema.clone();

    const model = mongoose.model(`Log_${project?.id}`, schema, `logs_${project?.id}`);
    // @ts-ignore
    registry[project?.id] = model;
    return model;
}

module.exports = {
    initLogger,
    getLogModel
}