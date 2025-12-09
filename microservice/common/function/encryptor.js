//@ts-check

const crypto = require("crypto")
const algorithm = "aes-256-ctr";

/**
 * 
 * @param {string} text 
 * @returns 
 */
const encrypt = (text) => {
    // @ts-ignore
    const secretKey = decryptSecret(process?.env?.ENC_CRYPTO_SECRET)
    const iv = crypto.randomBytes(16);
    // @ts-ignore
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return [iv.toString("hex"), encrypted.toString("hex")].join(":");
};

/**
 * 
 * @param {string} hash 
 * @returns 
 */
const decrypt = (hash) => {
    const [iv, content] = hash.split(":")

    const secretKey = decryptSecret(process?.env?.ENC_CRYPTO_SECRET)
    const decipher = crypto.createDecipheriv(
        algorithm,
        secretKey,
        Buffer.from(iv, "hex")
    );

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(content, "hex")),
        decipher.final(),
    ]);

    return decrypted.toString();
};

/**
 * 
 * @param {string} text 
 * @param {string} salt 
 * @returns 
 */
const hashString = (text, salt = "") => {
    const CRYPTO_SECRET = decryptSecret(process?.env?.ENC_CRYPTO_SECRET)
    if (!CRYPTO_SECRET) {
        throw new Error('ENC_CRYPTO_SECRET not configured')
    }

    return crypto
        .createHmac('sha256', CRYPTO_SECRET || "")
        .update(text + salt)
        .digest('hex')
}

/**
 * 
 * @param {string|undefined} secret 
 * @returns 
 */
const decryptSecret = (secret) => {

    if (!secret) {
        return null
    }

    if (!process.env.MASTER_KEY) {
        throw new Error("MASTER_KEY missing")
    }

    const [ivHex, contentHex] = secret.split(":")

    const decipher = crypto.createDecipheriv(
        algorithm,
        process.env.MASTER_KEY,
        Buffer.from(ivHex, "hex")
    );

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(contentHex, "hex")),
        decipher.final(),
    ]);

    return decrypted?.toString();

}

module.exports = {
    encrypt,
    decrypt,
    hashString,
    decryptSecret
}