//@ts-check

const { JSONParseX, decrypt } = require("common/function")
const { getUserFromCache } = require("../../shared/cache")
const { isValidObjectId, mongoose } = require("../../shared/mongoose")
const { ObjectId } = mongoose.Types
const geoip = require("geoip-lite")
const bcrypt = require("bcryptjs")

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



/**
 * 
 * @param {string} credentials 
 * @param {string} inputPassword 
 * @returns 
 */
const verifyUserPassword = async (credentials, inputPassword) => {
    const { password } = await JSONParseX(decrypt(credentials));
    const isPasswordMatch = await bcrypt.compare(inputPassword, password);
    return isPasswordMatch
}

/**
 * 
 * @param {string} userId 
 * @param {string} access 
 * @returns 
 */
const canUserDo = async (userId, access) => {
    if (!isValidObjectId(userId) || !access) {
        return false
    }

    const user = await getUserFromCache(userId);
    if (!user) {
        return false
    }

    return user?.permissions?.includes(access)

}

/**
 * 
 * @param {*} req 
 * @returns 
 */
const getLastLogin = (req) => {

    let ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip
    let userAgent = req.headers['user-agent'];

    const geo = geoip.lookup(ip);
    const location = geo ? `${geo.city}, ${geo.country}` : 'Unknown';

    return {
        at: new Date(),
        from: {
            ip,
            userAgent,
            location
        }
    }
}


module.exports = {
    buildUserSearchQuery,
    mapUser,
    getLastLogin,
    canUserDo,
    verifyUserPassword
}