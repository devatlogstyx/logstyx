//@ts-check

const { sanitizeObject } = require("common/function")

/**
 *
 * @param {*} json
 * @returns
 */
exports.mapUser = (json) => {
    return {
        id: json?.id || json?._id?.toString(),
        email: json?.email,
        fullname: json?.fullname,
        image: json?.image,
        permissions: json?.permissions,
    }
}

/**
 *
 * @param {*} json
 * @returns
 */
exports.mapUserInvitation = (json) => {
    return sanitizeObject({
        id: json?.id || json?._id?.toString(),
        email: json?.email,
        permissions: json?.permissions,
        projects: json?.projects
    })
}
