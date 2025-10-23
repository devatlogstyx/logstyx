//@ts-check
const { JSONParseX, decrypt } = require("common/function");
const bcrypt = require("bcryptjs");

const verifyUserPassword = async (credentials, inputPassword) => {
    const { password } = await JSONParseX(decrypt(credentials));
    const isPasswordMatch = await bcrypt.compare(inputPassword, password);
    return isPasswordMatch
}

module.exports = {

    verifyUserPassword,

}