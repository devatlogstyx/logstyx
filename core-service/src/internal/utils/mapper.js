module.exports = {
    mapProjectUser: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            project: json?.project?.toString(),
            user: {
                id: json?.user?.userId?.toString(),
                fullname: json?.fullname,
            },
        }
    }
}