"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const crypto = tslib_1.__importStar(require("crypto"));
const ALGORITHM = 'aes-256-cbc';
const BLOCK_SIZE = 16;
const ORIGINAL_ENCODING = 'utf8';
const ENCRYPTED_ENCODING = 'hex';
function getKey(secret) {
    return crypto.createHash('sha256').update(secret).digest();
}
function generateIv() {
    return crypto.randomBytes(BLOCK_SIZE);
}
function encrypt(key, json) {
    try {
        const str = JSON.stringify(json);
        const ivBuffer = generateIv();
        const cipher = crypto.createCipheriv(ALGORITHM, key, ivBuffer);
        const encryptedStr = cipher.update(str, ORIGINAL_ENCODING, ENCRYPTED_ENCODING) + cipher.final(ENCRYPTED_ENCODING);
        const r = {
            iv: ivBuffer.toString(ENCRYPTED_ENCODING),
            data: encryptedStr
        };
        return JSON.stringify(r);
    }
    catch (err) {
        throw err;
    }
}
function decrypt(key, { iv, data }) {
    try {
        const ivBuffer = Buffer.from(iv, ENCRYPTED_ENCODING);
        const decipher = crypto.createDecipheriv(ALGORITHM, key, ivBuffer);
        const decryptedStr = decipher.update(data, ENCRYPTED_ENCODING, ORIGINAL_ENCODING) + decipher.final(ORIGINAL_ENCODING);
        const r = JSON.parse(decryptedStr);
        return r;
    }
    catch (err) {
        throw err;
    }
}
exports.default = (secret) => {
    const key = getKey(secret);
    return {
        encrypt: encrypt.bind(null, key),
        decrypt: decrypt.bind(null, key)
    };
};
