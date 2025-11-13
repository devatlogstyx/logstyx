//@ts-check

const zlib = require('zlib');
const { promisify } = require('util');
const { encrypt, decrypt } = require('common/function');

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

// Compress then encrypt
/**
 * 
 * @param {string} jsonString 
 * @returns 
 */
async function compressAndEncrypt(jsonString) {
    // 1. Compress
    const compressed = await gzip(Buffer.from(jsonString, 'utf-8'));

    // 2. Encrypt (using your existing encrypt function)
    // Assuming your encrypt() returns { iv, content }
    return encrypt(compressed.toString('base64'));
}

// Decrypt then decompress
/**
 * 
 * @param {object} encryptedObj
 * @param {string} encryptedObj.iv
 * @param {string} encryptedObj.content
 * @returns 
 */
async function decryptAndDecompress(encryptedObj) {
    // 1. Decrypt (using your existing decrypt function)
    const decrypted = decrypt(encryptedObj);

    // 2. Decompress
    const compressed = Buffer.from(decrypted, 'base64');
    const decompressed = await gunzip(compressed);

    return decompressed.toString('utf-8');
}

module.exports = {
    compressAndEncrypt,
    decryptAndDecompress
}