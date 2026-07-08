//@ts-check

const { isValidObjectId, mongoose } = require("../../shared/mongoose")
const { HttpError } = require("common/function")
const { INVALID_INPUT_ERR_CODE } = require("common/constant")
const { default: striptags } = require("striptags")
const { ObjectId } = mongoose.Types

/**
 *
 * @param {object} [params]
 * @param {string} [params.search]
 * @param {string} [params.project]
 * @param {string} [params.user]
 * @returns
 */
const buildBucketSearchQuery = (params = {}) => {
    let queryBucket = {};
    let queryUser = {};

    if (params.search && typeof params.search === "string") {
        queryBucket.$or = [
            {
                title: {
                    $regex: params?.search,
                    $options: "i"
                }
            }
        ];
    }

    if (params?.project && isValidObjectId(params?.project)) {
        queryBucket.projects = ObjectId.createFromHexString(params?.project);
    }

    if (params?.user && isValidObjectId(params?.user)) {
        queryUser["user.userId"] = ObjectId.createFromHexString(params?.user);
    }

    return {
        queryUser,
        queryBucket
    };
};

/**
 *
 * @param {*} json
 * @returns
 */
const mapBucket = (json) => {
    return {
        id: json?.id || json?._id?.toString(),
        title: json?.title,
        projects: json?.projects,
        settings: json?.settings,
        createdAt: json?.createdAt
    }
}

/**
 *
 * @param {string} field
 * @returns
 */
const validateCustomIndex = (field, maxDepth = 5) => {
    const cleaned = striptags(field);

    // Must start with context or data
    if (!/^(context|data)\./.test(cleaned)) {
        return false;
    }

    // Check valid identifier pattern
    if (!/^(context|data)(\.[a-zA-Z_$][\w$]*)+$/.test(cleaned)) {
        return false;
    }

    // Limit depth (prevent data.a.b.c.d.e.f.g.h.i.j...)
    const depth = cleaned.split('.').length - 1; // -1 because first is context/data
    if (depth > maxDepth) {
        return false;
    }

    return true;
}

/**
 *
 * @param {string} field
 * @returns
 */
const sanitizeFieldName = (field) => {
    if (!/^[a-zA-Z0-9_.]+$/.test(field)) {
        throw HttpError(INVALID_INPUT_ERR_CODE, 'Invalid field name');
    }
    return field.replace(/\./g, '_');
};

module.exports = {
    buildBucketSearchQuery,
    mapBucket,
    validateCustomIndex,
    sanitizeFieldName
}
