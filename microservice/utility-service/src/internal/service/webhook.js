//@ts-check
const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, NOT_FOUND_ERR_MESSAGE, WEBHOOK_CACHE_KEY, BEARER_WEBHOOK_AUTH_TYPE, BASIC_WEBHOOK_AUTH_TYPE, API_KEY_WEBHOOK_AUTH_TYPE } = require("common/constant");
const { HttpError, compressAndEncrypt, sanitizeObject, decryptAndDecompress, num2Ceil, num2Floor, parseSortBy } = require("common/function");
const { Validator } = require("node-input-validator");
const { mongoose, isValidObjectId } = require("../../shared/mongoose");
const { striptags } = require("striptags");
const webhookModel = require("../model/webhook.model");
const { updateWebhookCache, getWebhookFromCache } = require("../../shared/cache");
const { submitRemoveCache } = require("../../shared/provider/mq-producer");

/**
 * 
 * @param {*} params 
 * @returns 
 */
const createWebhook = async (params) => {
    const v = new Validator(params, {
        title: "required|string",
        "connection.url": "required|url",
        "connection.method": "required|string|in:GET,POST,PUT,PATCH,DELETE",
        "connection.headers": "object",
        "connection.body_template": "required",
        "connection.timeout": "numeric",
        "connection.auth.type": "required|string|in:NONE,BEARER,BASIC,API_KEY"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }


    // Validate auth connection based on type
    const authType = params?.connection?.auth?.type;
    if (authType === BEARER_WEBHOOK_AUTH_TYPE && !params?.connection?.auth?.token) {
        throw HttpError(INVALID_INPUT_ERR_CODE, "Token is required for bearer auth");
    }
    if (authType === BASIC_WEBHOOK_AUTH_TYPE && (!params?.connection?.auth?.username || !params?.connection?.auth?.password)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, "Username and password are required for basic auth");
    }
    if (authType === API_KEY_WEBHOOK_AUTH_TYPE && (!params?.connection?.auth?.key_name || !params?.connection?.auth?.key_value)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, "Key name and value are required for API key auth");
    }

    // Validate body_template contains valid JSON or string
    let bodyTemplate = params?.connection?.body_template;
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
        // Encrypt the connection
        const connectionEncrypted = await compressAndEncrypt({
            url: params.connection.url,
            method: params.connection.method || 'POST',
            headers: params.connection.headers || {},
            body_template: bodyTemplate,
            timeout: params.connection.timeout || 10000,
            auth: {
                type: params.connection.auth.type,
                ...(params.connection.auth.token && { token: params.connection.auth.token }),
                ...(params.connection.auth.username && { username: params.connection.auth.username }),
                ...(params.connection.auth.password && { password: params.connection.auth.password }),
                ...(params.connection.auth.key_name && { key_name: params.connection.auth.key_name }),
                ...(params.connection.auth.key_value && { key_value: params.connection.auth.key_value }),
                ...(params.connection.auth.key_location && { key_location: params.connection.auth.key_location }),
                ...(params.connection.auth.client_id && { client_id: params.connection.auth.client_id }),
                ...(params.connection.auth.client_secret && { client_secret: params.connection.auth.client_secret }),
                ...(params.connection.auth.token_url && { token_url: params.connection.auth.token_url }),
                ...(params.connection.auth.scope && { scope: params.connection.auth.scope })
            }
        });

        const payload = sanitizeObject({
            title: striptags(params.title),
            connection: connectionEncrypted,
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
        "connection.url": "url",
        "connection.method": "string|in:GET,POST,PUT,PATCH,DELETE",
        "connection.headers": "object",
        "connection.timeout": "numeric",
        "connection.auth.type": "required|string|in:NONE,BEARER,BASIC,API_KEY"
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

        // If connection is being updated, re-encrypt
        if (params.connection) {
            let bodyTemplate = params.connection.body_template;
            if (typeof bodyTemplate === 'string') {
                try {
                    bodyTemplate = JSON.parse(bodyTemplate);
                } catch (e) {
                    // Plain string, keep as is
                }
            }

            updateData.connection = await compressAndEncrypt({
                url: params.connection.url,
                method: params.connection.method || 'POST',
                headers: params.connection.headers || {},
                body_template: bodyTemplate,
                timeout: params.connection.timeout || 10000,
                auth: params.connection.auth
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

    webhook.connection = await decryptAndDecompress(webhook.connection);

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

    const queryParam = buildWebhookSearchQuery(query)

    let res = await webhookModel.paginate(queryParam, { sortBy, limit, page });

    let list = {
        results: res?.results?.map((n) => ({
            id: n?._id?.toString(),
            title: n?.title,
            createdAt: n?.createdAt,
            updatedAt: n?.updatedAt,
        })),
        page,
        totalResults: res.totalResults,
        totalPages: res.totalPages,
    };

    return list;
};

module.exports = {
    createWebhook,
    updateWebhook,
    removeWebhook,
    findWebhookById,
    paginateWebhook,
};