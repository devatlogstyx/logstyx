const { decrypt } = require("common/function")

module.exports = {
    mapProjectUser: (json) => {
        return {
            id: json?.user?.userId?.toString(),
            fullname: json?.user?.fullname,
            createdAt: json?.createdAt
        }
    },
    mapProject: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            slug: json?.slug,
            secret: json?.secret,
            settings: {
                indexes: json?.settings?.indexes,
                allowedOrigin: json?.settings?.allowedOrigin,
                retentionDays: json?.settings?.retentionDays,
            },
            createdAt: json?.createdAt
        }
    },
    mapLog: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            key: json?.key,
            level: json?.level,
            device: json?.device,
            context: json?.context?.iv && json?.context?.content ? JSON.parse(decrypt(json?.context)) : json?.context,
            data: json?.data?.iv && json?.data?.content ? JSON.parse(decrypt(json?.data)) : json?.data,
            hash: json?.hash,
            count: json?.count,
            createdAt:json?.createdAt,
            updatedAt:json?.updatedAt,
        }
    }
}