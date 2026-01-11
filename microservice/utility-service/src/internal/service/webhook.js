//@ts-check
const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, WEBHOOK_CACHE_KEY } = require("common/constant");
const { HttpError, compressAndEncrypt, sanitizeObject, decryptAndDecompress, num2Ceil, num2Floor, parseSortBy } = require("common/function");
const { Validator } = require("node-input-validator");
const { mongoose, isValidObjectId } = require("../../shared/mongoose");
const { striptags } = require("striptags");
const webhookModel = require("../model/webhook.model");
const { updateWebhookCache, getWebhookFromCache } = require("../../shared/cache");
const { submitRemoveCache } = require("../../shared/provider/mq-producer");
const { ObjectId } = mongoose.Types

/**
 * 
 * @param {*} params 
 * @returns 
 */
const createWebhook = async (params) => {
    const v = new Validator(params, {
        title: "required|string",
        "config.url": "required|url",
        "config.method": "required|string|in:GET,POST,PUT,PATCH,DELETE",
        "config.headers": "object",
        "config.body_template": "required",
        "config.timeout": "numeric",
        "config.auth.type": "required|string|in:none,bearer,basic,api_key,oauth2"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }


    // Validate auth config based on type
    const authType = params?.config?.auth?.type;
    if (authType === 'bearer' && !params?.config?.auth?.token) {
        throw HttpError(INVALID_INPUT_ERR_CODE, "Token is required for bearer auth");
    }
    if (authType === 'basic' && (!params?.config?.auth?.username || !params?.config?.auth?.password)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, "Username and password are required for basic auth");
    }
    if (authType === 'api_key' && (!params?.config?.auth?.key_name || !params?.config?.auth?.key_value)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, "Key name and value are required for API key auth");
    }

    // Validate body_template contains valid JSON or string
    let bodyTemplate = params?.config?.body_template;
    if (typeof bodyTemplate === 'string') {
        try {
            // Try to parse if it's a JSON string
            bodyTemplate = JSON.parse(bodyTemplate);
        } catch (e) {
            // It's a plain string template, that's fine
        }
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Encrypt the config
        const configEncrypted = await compressAndEncrypt({
            url: params.config.url,
            method: params.config.method || 'POST',
            headers: params.config.headers || {},
            body_template: bodyTemplate,
            timeout: params.config.timeout || 10000,
            auth: {
                type: params.config.auth.type,
                ...(params.config.auth.token && { token: params.config.auth.token }),
                ...(params.config.auth.username && { username: params.config.auth.username }),
                ...(params.config.auth.password && { password: params.config.auth.password }),
                ...(params.config.auth.key_name && { key_name: params.config.auth.key_name }),
                ...(params.config.auth.key_value && { key_value: params.config.auth.key_value }),
                ...(params.config.auth.key_location && { key_location: params.config.auth.key_location }),
                ...(params.config.auth.client_id && { client_id: params.config.auth.client_id }),
                ...(params.config.auth.client_secret && { client_secret: params.config.auth.client_secret }),
                ...(params.config.auth.token_url && { token_url: params.config.auth.token_url }),
                ...(params.config.auth.scope && { scope: params.config.auth.scope })
            }
        });

        const payload = sanitizeObject({
            title: striptags(params.title),
            createdBy: ObjectId.createFromHexString(params.creator),
            config: configEncrypted,
        });

        const [webhook] = await webhookModel.create([payload], { session });

        await session.commitTransaction();

        return updateWebhookCache(webhook._id.toString());

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession();
    }
};

/**
 * 
 * @param {*} id 
 * @param {*} params 
 * @returns 
 */
const updateWebhook = async (id, params) => {

    if (!isValidObjectId(id)) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const webhook = await getWebhookFromCache(id);
    if (!webhook) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    }

    const v = new Validator(params, {
        title: "string",
        "config.url": "url",
        "config.method": "string|in:GET,POST,PUT,PATCH,DELETE",
        "config.headers": "object",
        "config.timeout": "numeric",
        "config.auth.type": "string|in:none,bearer,basic,api_key,oauth2"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const updateData = {};

        if (params.title) {
            updateData.title = striptags(params.title);
        }

        if (params.enabled !== undefined) {
            updateData.enabled = params.enabled;
        }

        // If config is being updated, re-encrypt
        if (params.config) {
            let bodyTemplate = params.config.body_template;
            if (typeof bodyTemplate === 'string') {
                try {
                    bodyTemplate = JSON.parse(bodyTemplate);
                } catch (e) {
                    // Plain string, keep as is
                }
            }

            updateData.config = await compressAndEncrypt({
                url: params.config.url,
                method: params.config.method || 'POST',
                headers: params.config.headers || {},
                body_template: bodyTemplate,
                timeout: params.config.timeout || 10000,
                auth: params.config.auth
            });
        }

        await webhookModel.findByIdAndUpdate(
            id,
            { $set: sanitizeObject(updateData) },
            { session }
        );

        await session.commitTransaction();

        return await updateWebhookCache(id);

    } catch (e) {
        await session.abortTransaction();
        throw e;
    } finally {
        session.endSession();
    }
};

/**
 * 
 * @param {*} id 
 * @returns 
 */
const removeWebhook = async (id) => {
    if (!isValidObjectId(id)) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE)
    }

    const webhook = await getWebhookFromCache(id);
    if (!webhook) {
        throw HttpError(NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE);
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        await webhookModel.findByIdAndDelete(id, { session });

        await session.commitTransaction();

        submitRemoveCache({
            key: WEBHOOK_CACHE_KEY,
            id
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
 * @param {string} id 
 * @returns 
 */
const findWebhookById = async (id) => {
    if (!isValidObjectId(id)) {
        return null
    }

    const webhook = await getWebhookFromCache(id);
    if (!webhook) {
        return null;
    }

    webhook.config = await decryptAndDecompress(webhook.config);

    return webhook;
};

/**
 * 
 * @param {*} params 
 */
const buildWebhookSearchQuery = (params = {}) => {
    let query = {}

    if (params?.search) {
        query.$or = [
            {
                title: {
                    $regex: params.search,
                    $options: "i"
                }
            }
        ]
    }
}

/**
 * 
 * @param {*} query 
 * @param {*} sortBy 
 * @param {*} limit 
 * @param {*} page 
 * @returns 
 */
const paginateWebhook = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {

    limit = num2Ceil(num2Floor(limit, 1), 50);
    page = num2Floor(page, 1);
    const sort = parseSortBy(sortBy);
    const queryParam = buildWebhookSearchQuery(query)


    const aggregate = webhookModel.aggregate([
        { $match: queryParam },
        { $sort: sort }
    ]);

    let options = { page, limit };

    let res = await webhookModel.aggregatePaginate(aggregate, options);

    let list = {
        results: res?.docs?.map((n) => ({
            id: n?._id?.toString(),
            title: n?.title,
            createdAt: n?.createdAt,
            updatedAt: n?.updatedAt,
        })),
        page,
        totalResults: res.total,
        totalPages: res.pages,
    };

    return list;
};

const testConnection = async(connection)=>{

}

module.exports = {
    createWebhook,
    updateWebhook,
    removeWebhook,
    findWebhookById,
    paginateWebhook,
    testConnection
};