//@ts-check

const { INVALID_INPUT_ERR_CODE } = require("common/constant");
const { HttpError, sanitizeObject, hashString } = require("common/function");
const { Validator } = require("node-input-validator");


const validateCreateInput = async (params) => {
    const v = new Validator(params, {
        email: "required|email",
        permissions: "required|arrayUnique",
        projects: "arrayUnique",
        creator: params.projects && params.projects.length > 0 ? "required|string" : "string"
    });

    let match = await v.check();
    if (!match) {
        throw HttpError(INVALID_INPUT_ERR_CODE, v.errors);
    }
}

const mapUserInvitation = (json) => {
    return sanitizeObject({
        id: json?.id || json?._id?.toString(),
        email: json?.email,
        permissions: json?.permissions,
        projects: json?.projects
    })
}

/**
 * 
 * @param {object} [params] 
 * @param {string} [params.search]
 * @param {string} [params.permissions]
 * @returns 
 */
const buildUserInvitationSearchQuery = (params) => {
    let query = {}
    if (params?.search && typeof params.search === "string") {
        query.$or = [
            {
                "hash.email": hashString(params?.search)
            }
        ]
    }

    if (params?.permissions && typeof params?.permissions === "string") {
        query.permissions = {
            $in: params?.permissions?.split(",")
        }
    }

    return query
}

module.exports = {
    validateCreateInput,
    mapUserInvitation,
    buildUserInvitationSearchQuery
}