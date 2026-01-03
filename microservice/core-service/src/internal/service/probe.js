//@ts-check

const { INVALID_INPUT_ERR_CODE, NOT_FOUND_ERR_CODE, BEARER_PROBE_AUTH_TYPE, PROJECT_NOT_FOUND_ERR_MESSAGE, BASIC_PROBE_AUTH_TYPE, HMAC_PROBE_AUTH_TYPE, NOT_FOUND_ERR_MESSAGE, PROBE_CACHE_KEY, INVALID_ID_ERR_MESSAGE } = require("common/constant");
const { HttpError, compressAndEncrypt, sanitizeObject, decryptAndDecompress, num2Ceil, num2Floor, parseSortBy } = require("common/function");
const { Validator } = require("node-input-validator");
const { getProjectFromCache, updateProbeCache, getProbeFromCache } = require("../../shared/cache");
const probeModel = require("../model/probe.model");
const { mongoose, isValidObjectId } = require("./../../shared/mongoose");
const { default: striptags } = require("striptags");
const { submitRemoveCache } = require("../../shared/provider/mq-producer");
const projectUserModel = require("../model/project.user.model");
const { ObjectId } = mongoose.Types

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
        "connection.auth.type": "required|string|in:none,bearer,basic,hmac,custom",
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
    if (authType === HMAC_PROBE_AUTH_TYPE && !params?.connection?.auth?.secret) {
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

        const [probe] = await probeModel.create([payload], { session });

        await session.commitTransaction();

        return updateProbeCache(probe?._id?.toString());

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
        "connection.auth.type": "string|in:none,bearer,basic,hmac,custom",
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
        if (authType === HMAC_PROBE_AUTH_TYPE && !params?.connection?.auth?.secret) {
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

        await probeModel.findByIdAndUpdate(
            id,
            { $set: sanitizeObject(updateData) },
            { session }
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
        await probeModel.findByIdAndDelete(id, { session });

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

/**
 * 
 * @param {*} params 
 * @returns 
 */
const buildProbeSearchQuery = (params = {}) => {
    let queryProbe = {};
    let queryUser = {};

    if (params.search) {
        queryProbe.$or = [
            {
                title: {
                    $regex: params?.search,
                    $options: "i"
                }
            }
        ];
    }

    if (params?.project) {
        queryProbe.project = ObjectId.createFromHexString(params?.project);
    }

    if (params?.user) {
        queryUser["user.userId"] = ObjectId.createFromHexString(params?.user);
    }

    return {
        queryUser,
        queryProbe
    };
};

const paginateProbe = async (query = {}, sortBy = "createdAt:desc", limit = 10, page = 1) => {
    const {
        queryUser,
        queryProbe
    } = buildProbeSearchQuery(query);

    limit = num2Ceil(num2Floor(limit, 1), 50);
    page = num2Floor(page, 1);
    const sort = parseSortBy(sortBy);

    const aggregate = projectUserModel.aggregate([
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
    ]);

    let options = { page, limit };

    let res = await projectUserModel.aggregatePaginate(aggregate, options);

    let list = {
        results: res?.docs?.map((n) => {
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
                updatedAt: n?.updatedAt
            };
        }),
        page,
        totalResults: res.total,
        totalPages: res.pages,
    };

    return list;
};

module.exports = {
    createProbe,
    findProbeById,
    updateProbe,
    removeProbe,
    paginateProbe
}
