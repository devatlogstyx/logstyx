//@ts-check

const { isValidObjectId, mongoose } = require("../../shared/mongoose")
const { ObjectId } = mongoose.Types

/**
 *
 * @param {object} [params]
 * @param {string} [params.search]
 * @param {string[]} [params.ids]
 * @param {string} [params.user]
 * @returns
 */
const buildProjectSearchQuery = (params = {}) => {
    let queryProject = {}
    let queryUser = {}
    if (params.search && typeof params.search === "string") {
        queryProject.$or = [
            {
                title: {
                    $regex: params?.search,
                    $options: "i"
                }
            }
        ]
    }

    if (params.ids && Array.isArray(params.ids)) {
        queryProject._id = {
            $in: params?.ids?.map((n) => ObjectId.createFromHexString(n))
        }
    }

    if (params?.user && typeof params.user === "string") {
        queryUser["user.userId"] = ObjectId.createFromHexString(params?.user)
    }

    return {
        queryUser,
        queryProject
    }
}

module.exports = {
    buildProjectSearchQuery
}
