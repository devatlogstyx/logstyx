module.exports = {
    mapProjectUser: (json) => {
        return {
            id: json?.user?.userId?.toString(),
            fullname: json?.user?.fullname,
            createdAt:json?.createdAt
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
            createdAt:json?.createdAt
        }
    }
}