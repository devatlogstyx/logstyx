//@ts-check
const { JSONParseX, decrypt } = require("common/function");
const bcrypt = require("bcryptjs");
const { getUserFromCache } = require("../../shared/cache");
const { isValidObjectId } = require("../../shared/mongoose");
const { BROWSER_CLIENT_TYPE } = require("common/constant");
const geoip = require('geoip-lite');

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
const CanUserDo = async (userId, access) => {
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
    getLastLogin,
    verifyUserPassword,
    CanUserDo

}