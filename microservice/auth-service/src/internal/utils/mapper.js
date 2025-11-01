module.exports = {
    mapUser: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            fullname: json?.fullname,
            image: json?.image,
            permissions: json?.permissions
        }
    },
    mapUserInvitation: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            email: json?.email,
            permissions: json?.permissions,
        }
    },
}