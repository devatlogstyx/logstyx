const { sanitizeObject } = require("common/function")

module.exports = {
    mapUser: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            email: json?.email,
            fullname: json?.fullname,
            image: json?.image,
            permissions: json?.permissions,
        }
    },
    mapUserInvitation: (json) => {
        return sanitizeObject({
            id: json?.id || json?._id?.toString(),
            email: json?.email,
            permissions: json?.permissions,
            projects: json?.projects
        })
    },
}