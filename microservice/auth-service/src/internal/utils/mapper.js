module.exports = {
    mapUser: (json) => {
        return {
            id: json?.id || json?._id?.toString(),
            fullname: json?.fullname,
            image: json?.image,
        }
    },
}