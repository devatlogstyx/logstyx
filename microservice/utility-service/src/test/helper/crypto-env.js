const crypto = require("crypto");

// `decryptSecret` feeds MASTER_KEY straight into aes-256-ctr, so it has to be
// exactly 32 bytes -- same as the 32-char key install.sh generates.
const MASTER_KEY = "0123456789abcdef0123456789abcdef";

// What ENC_CRYPTO_SECRET decrypts to. Also used as an aes-256 key downstream.
const CRYPTO_SECRET = "fedcba9876543210fedcba9876543210";

/**
 * Wrap a plaintext secret the way the ENC_* env vars are stored: aes-256-ctr
 * under MASTER_KEY, serialized as "<ivHex>:<contentHex>".
 *
 * @param {string} value
 * @param {string} [masterKey]
 * @returns {string}
 */
const sealSecret = (value, masterKey = MASTER_KEY) => {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-ctr", masterKey, iv);
    const content = Buffer.concat([cipher.update(value, "utf-8"), cipher.final()]);
    return [iv.toString("hex"), content.toString("hex")].join(":");
};

/**
 * Populate the crypto env vars for a test run.
 */
const useCryptoEnv = () => {
    process.env.MASTER_KEY = MASTER_KEY;
    process.env.ENC_CRYPTO_SECRET = sealSecret(CRYPTO_SECRET);
};

module.exports = {
    MASTER_KEY,
    CRYPTO_SECRET,
    sealSecret,
    useCryptoEnv,
};
