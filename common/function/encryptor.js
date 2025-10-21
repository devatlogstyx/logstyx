//@ts-check

const crypto = require("crypto")
const algorithm = "aes-256-ctr";

const encrypt = (text) => {
    const secretKey = decryptSecret(process?.env?.ENC_CRYPTO_SECRET)
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);

    const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

    return {
        iv: iv.toString("hex"),
        content: encrypted.toString("hex"),
    };
};

const decrypt = (hash) => {
    const secretKey = decryptSecret(process?.env?.ENC_CRYPTO_SECRET)
    const decipher = crypto.createDecipheriv(
        algorithm,
        secretKey,
        Buffer.from(hash.iv, "hex")
    );

    const decrypted = Buffer.concat([
        decipher.update(Buffer.from(hash.content, "hex")),
        decipher.final(),
    ]);

    return decrypted.toString();
};

const hashString = (text) => {
    const CRYPTO_SECRET = decryptSecret(process?.env?.ENC_CRYPTO_SECRET)

    return crypto
        .createHmac('sha256', CRYPTO_SECRET || "")
        .update(text)
        .digest('hex')
}

const decryptSecret = (secret) => {

    if(!secret){
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