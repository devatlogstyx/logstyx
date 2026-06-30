//@ts-check

const { isValidObjectId, mongoose } = require("../../shared/mongoose")
const { ObjectId } = mongoose.Types

/**
 * 
 * @param {object} [params]
 * @param {string} [params.search]
 * @param {string} [params.group]
 * @returns 
 */
const buildUserSearchQuery = (params = {}) => {

    let query = {}
    if (params?.search && typeof params.search === "string") {
        query.$or = [
            {
                fullname: {
                    $regex: params?.search?.toString(),
                    $options: "i"
                }
            }
        ]
    }

    if (params?.group && isValidObjectId(params?.group)) {
        query.group = ObjectId.createFromHexString(params?.group?.toString())
    }

    return query

}

const mapUser = (json) => {
    return {
        id: json?.id || json?._id?.toString(),
        email: json?.email,
        fullname: json?.fullname,
        image: json?.image,
        permissions: json?.permissions,
    }
}


module.exports = {
    buildUserSearchQuery,
    mapUser
}