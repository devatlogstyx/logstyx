const { decryptAndDecompress } = require("common/function");

module.exports = {
    mapProjectUser: (json) => {
        return {
            id: json?.user?.userId?.toString(),
            fullname: json?.user?.fullname,
            createdAt: json?.createdAt
        }
    },
    mapBucket: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            title: json?.title,
            projects: json?.projects,
            settings: json?.settings,
            createdAt: json?.createdAt
        }
    },
    mapProject: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            title: json?.title,
            slug: json?.slug,
            secret: json?.secret,
            settings: {
                allowedOrigin: json?.settings?.allowedOrigin,
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