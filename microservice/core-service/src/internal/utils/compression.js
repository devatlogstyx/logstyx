//@ts-check

const zlib = require('zlib');
const { promisify } = require('util');
const { decryptSecret } = require('common/function');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const crypto = require("crypto")

const algorithm = 'aes-256-cbc';

/**
 * 
 * @param {*} obj 
 * @returns 
 */
async function compressAndEncrypt(obj) {
    const secretString = decryptSecret(process?.env?.ENC_CRYPTO_SECRET)
    const secretKey = Buffer.from(secretString, 'utf-8');

    const jsonString = JSON.stringify(obj);
    const compressed = await gzip(Buffer.from(jsonString, 'utf-8'));

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, secretKey, iv);
    const encrypted = Buffer.concat([cipher.update(compressed), cipher.final()]);

    // Prepend IV to encrypted data, return single base64 string
    const combined = Buffer.concat([iv, encrypted]);
    return combined.toString('base64');
}

/**
 * 
 * @param {string} encryptedString 
 * @returns 
 */
async function decryptAndDecompress(encryptedString) {
    const secretString = decryptSecret(process?.env?.ENC_CRYPTO_SECRET)
    const secretKey = Buffer.from(secretString, 'utf-8');

    const combined = Buffer.from(encryptedString, 'base64');

    // Extract IV (first 16 bytes)
    const iv = combined.subarray(0, 16);
    const encrypted = combined.subarray(16);

    // Decrypt
    const decipher = crypto.createDecipheriv(algorithm, secretKey, iv);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);

    // Decompress
    const decompressed = await gunzip(decrypted);

    return JSON.parse(decompressed.toString('utf-8'));
}


module.exports = {
    compressAndEncrypt,
    decryptAndDecompress
}