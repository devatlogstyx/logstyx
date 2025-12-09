const { decryptAndDecompress } = require("./compression");

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
                rawIndexes: json?.settings?.rawIndexes,
                allowedOrigin: json?.settings?.allowedOrigin,
                retentionDays: json?.settings?.retentionDays,
            },
            createdAt: json?.createdAt
        }
    },
    mapLog: async (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            key: json?.key,
            level: json?.level,
            device: json?.device,
            context: await decryptAndDecompress(json?.context),
            data: await decryptAndDecompress(json?.data),
            hash: json?.hash,
            count: json?.count,
            createdAt: json?.createdAt,
            updatedAt: json?.updatedAt,
        }
    }
}