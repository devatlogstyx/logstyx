//@ts-check
const { JSONParseX, decrypt } = require("common/function");
const bcrypt = require("bcryptjs");
const { getUserFromCache } = require("../../shared/cache");
const { isValidObjectId } = require("../../shared/mongoose");

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

module.exports = {

    verifyUserPassword,
    CanUserDo

}