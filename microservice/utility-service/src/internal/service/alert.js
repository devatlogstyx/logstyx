//@ts-check
const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, INVALID_ID_ERR_MESSAGE } = require("common/constant");
const { HttpError, decryptAndDecompress, sanitizeObject, num2Ceil, num2Floor, parseSortBy, num2Int } = require("common/function");
const { Validator } = require("node-input-validator");
const { findProjectById, listAllProject } = require("../../shared/provider/core.service");
const { getWebhookFromCache, updateAlertCache, getAlertFromCache } = require("../../shared/cache");
const { mongoose, isValidObjectId } = require("../../shared/mongoose");
const { extractMustacheVars, evaluateAlertFilter, parseMustacheTemplate } = require("../utils/helper");
const { striptags } = require("striptags");
const alertModel = require("../model/alert.model");
const { submitProcessLogAlert, submitProcessSendWebhook } = require("../../shared/provider/mq-producer");
const AlertDeduplicationModel = require("../model/alert.deduplication.model");
const { ObjectId } = mongoose.Types
const moment = require("moment-timezone")

/**
 * 
 * @param {*} params 
 * @returns 
 */
const createAlert = async (params) => {
    const v = new Validator(params, {
        title: "required|string",
        project: "required|string",
        webhook: "required|string",
        config: "required|object",
        "config.filter": "required|arrayUnique",
        "config.template": "required|object",
        "config.deduplicationMinutes": "numeric"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    const [project, webhook] = await Promise.all([
        findProjectById(params?.project),
        getWebhookFromCache(params?.webhook)
    ])

    if (!project || !webhook) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const webhookConnection = await decryptAndDecompress(webhook?.connection)

    const headerVars = extractMustacheVars(webhookConnection.headers);
    const bodyVars = extractMustacheVars(webhookConnection.body_template);
    const allVars = [...new Set([...headerVars, ...bodyVars])];

    if (allVars.length > 0) {
        const missingOrEmpty = allVars.filter(v => {
            const value = params?.template?.[v];
            return value === undefined || value === null || value === '';
        });

        if (missingOrEmpty.length > 0) {
            throw HttpError(
                INVALID_INPUT_ERR_CODE,
                `Missing or empty template variables: ${missingOrEmpty.join(', ')}`
            );
        }
    }

    const payload = sanitizeObject({
        title: striptags(params?.title),
        project: ObjectId.createFromHexString(project?.id),
        webhook: ObjectId.createFromHexString(webhook?.id),
        config: {
            filter: params?.config?.filter,
            template: params?.config?.template,
            deduplicationMinutes: num2Int(params?.config?.deduplicationMinutes)
        }
    });

    const alert = await alertModel.create(payload);

    return updateAlertCache(alert._id.toString());
}

/**
 * 
 * @param {string} id 
 * @param {*} params 
 * @returns 
 */
const updateAlert = async (id, params) => {

    if (!isValidObjectId(id)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, INVALID_ID_ERR_MESSAGE)
    }

    const alert = await getAlertFromCache(id)
    if (!alert) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const v = new Validator(params, {
        title: "required|string",
        project: "required|string",
        webhook: "required|string",
        config: "required|object",
        "config.filter": "required|arrayUnique",
        "config.template": "required|object",
        "config.deduplicationMinutes": "numeric"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    const [project, webhook] = await Promise.all([
        findProjectById(params?.project),
        getWebhookFromCache(params?.webhook)
    ])

    if (!project || !webhook) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const webhookConnection = await decryptAndDecompress(webhook?.connection)

    const headerVars = extractMustacheVars(webhookConnection.headers);
    const bodyVars = extractMustacheVars(webhookConnection.body_template);
    const allVars = [...new Set([...headerVars, ...bodyVars])];

    if (allVars.length > 0) {
        const missingOrEmpty = allVars.filter(v => {
            const value = params?.template?.[v];
            return value === undefined || value === null || value === '';
        });

        if (missingOrEmpty.length > 0) {
            throw HttpError(
                INVALID_INPUT_ERR_CODE,
                `Missing or empty template variables: ${missingOrEmpty.join(', ')}`
            );
        }
    }

    const payload = sanitizeObject({
        title: striptags(params?.title),
        project: ObjectId.createFromHexString(project?.id),
        webhook: ObjectId.createFromHexString(webhook?.id),
        config: {
            filter: params?.config?.filter,
            template: params?.config?.template,
            deduplicationMinutes: num2Int(params?.config?.deduplicationMinutes)
        }
    });

    await alertModel.findByIdAndUpdate(id, {
        $set: payload
    });

    return updateAlertCache(id);
}

/**
 * 
 * @param {*} id 
 * @returns 
 */
const findAlertById = async (id) => {
    if (!isValidObjectId(id)) {
        return null
    }

    const raw = await getAlertFromCache(id?.toString())
    if (!raw) {
        return null
    }

    return raw

}

/**
 * 
 * @param {*} id 
 * @returns 
 */
const removeAlert = async (id) => {
    if (!isValidObjectId(id)) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    await alertModel.findByIdAndDelete(id)

    return null

}

/**
 * 
 * @param {*} params 
 */
const buildAlertSearchQuery = (params = {}) => {
    let query = {}

    if (params?.search && typeof params?.search === "string") {
        query.$or = [
            {
                title: {
                    $regex: params.search,
                    $options: "i"
                }
            }
        ]
    }

    return query
}

/**
 * 
 * @param {*} query 
 * @param {string} sortBy 
 * @param {number} limit 
 * @param {number} page 
 */
const paginateAlert = async (query, sortBy = "createdAt:desc", limit = 10, page = 1) => {
    const queryParams = buildAlertSearchQuery(query)
    limit = num2Ceil(num2Floor(limit, 1), 50);
    page = num2Floor(page, 1);
    const sort = parseSortBy(sortBy)

    const aggregate = alertModel.aggregate([
        {
            $match: queryParams
        },
        {
            $lookup: {
                from: "webhooks",
                localField: "webhook",
                foreignField: "_id",
                as: "webhook",
            },
        },
        {
            $unwind: {
                path: "$webhook",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $sort: {
                ...sort
            }
        }
    ])

    const options = {
        page, limit
    }

    let res = await alertModel.aggregatePaginate(aggregate, options);

    let list = {
        results: res?.docs?.map((n) => ({
            id: n?._id?.toString(),
            title: n?.title,
            webhook: {
                id: n?.webhook?._id?.toString(),
                title: n?.webhook?.title
            },
            project: n?.project?.toString(),
            createdAt: n?.createdAt,
            updatedAt: n?.updatedAt,
        })),
        page,
        totalResults: res.total,
        totalPages: res.pages,
    };

    const projects = await listAllProject({
        ids: [...new Set(list?.results?.map((n) => n?.project).filter(Boolean))]
    })
    const projectMap = new Map(projects?.map(s => [s.id, s]));

    list.results = list?.results?.map((r) => {
        const project = projectMap.get(r?.project)
        r.project = {
            id: project?.id,
            title: project?.title
        }

        return r
    })


    return list;
}

/**
 * 
 * @param {*} projectId 
 * @param {*} alertId 
 * @param {*} params 
 * @returns 
 */
const processLogAlert = async (projectId, alertId, params) => {

    if (!isValidObjectId(projectId)) {
        return null
    }

    if (!alertId) {
        const alerts = alertModel.find({
            project: ObjectId.createFromHexString(projectId)
        }).cursor()

        for await (const alert of alerts) {
            submitProcessLogAlert({
                projectId,
                alertId: alert?._id?.toString(),
                params
            })
        }

        return null
    }

    // handle alert log
    const alert = await getAlertFromCache(alertId)
    if (!alert) {
        return null
    }

    if (alert?.config?.deduplicateMinute > 0) {
        try {
            // Atomic insert - will fail if key already exists
            await AlertDeduplicationModel.create({
                alert: ObjectId.createFromHexString(alertId),
                expireAt: moment(new Date()).add(alert?.config?.deduplicateMinute || 0, "minute").toDate(),
            });
        } catch (error) {
            return null
        }
    }



    const shouldTriggerAlert = evaluateAlertFilter(params, alert?.config?.filter ?? []);

    if (!shouldTriggerAlert) {
        return null
    }

    const webhookPayload = parseMustacheTemplate(alert?.config?.template ?? {}, params)

    submitProcessSendWebhook({
        webhookId: alert?.webhook?.toString(),
        payload: webhookPayload
    })


}

module.exports = {
    createAlert,
    updateAlert,
    findAlertById,
    removeAlert,
    paginateAlert,
    processLogAlert
}