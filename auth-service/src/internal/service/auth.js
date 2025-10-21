//@ts-check

const crypto = require("crypto");
const moment = require("moment-timezone");
const refreshTokenModel = require("../model/refresh-token.model");
const { decryptSecret } = require("common/function");

const REFRESH_TOKEN_SECRET = decryptSecret(process?.env?.ENC_REFRESH_TOKEN_SECRET)

const createRefreshToken = async (id) => {

    const salt = crypto.randomBytes(16).toString("hex");
    const token = crypto
        .createHmac("sha256", REFRESH_TOKEN_SECRET || "")
        .update(`${id}-${salt}`)
        .digest("hex");

    const payload = {
        token,
        salt,
        expiredAt: moment(new Date()).add(12, "hour").toDate(),
    };

    await refreshTokenModel.create(payload);

    return token;
};

const validateRefreshToken = async (id, token) => {
    if (!id || !token) {
        return null;
    }

    const refreshToken = await refreshTokenModel.findOne({
        token,
    });

    if (!refreshToken) {
        return null;
    }

    const expectedToken = crypto
        .createHmac("sha256", REFRESH_TOKEN_SECRET || "")
        .update(`${id}-${refreshToken?.salt}`)
        .digest("hex");
    if (expectedToken !== token) {
        return null
    }

    let nowTime = new Date().getTime();
    let expiredTime = new Date(refreshToken.expiredAt).getTime();

    // expired in two minutes
    if (expiredTime - nowTime < 2 * 60 * 1000) {
        return createRefreshToken(id);
    }

    //send the old one
    return token;
};

const expireRefreshToken = async (token) => {
    await refreshTokenModel.findOneAndDelete({ token });

    return null;
};

module.exports = {
    createRefreshToken,
    expireRefreshToken,
    validateRefreshToken
}