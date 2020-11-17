#!/usr/bin/env node
"use strict";
// 用.egookey生成加密后的服务器配置文件(server_config.json)
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = require('path');
const fs = require('fs');
const os = require('os');
const util = require('util');
const fsreadFile = util.promisify(fs.readFile);
const fswriteFile = util.promisify(fs.writeFile);
const cipher_1 = tslib_1.__importDefault(require("./core/cipher"));
const root = path.join(__dirname, '..');
let keypath = path.join(root, 'data', '.egookey');
async function getCipher() {
    const secret = await fsreadFile(keypath, 'utf-8');
    const cipher = cipher_1.default(secret);
    return cipher;
}
async function getServerConfigContent() {
    const content = await fsreadFile(path.join(root, 'data', 'server_config_origin.json'));
    return content;
}
async function run() {
    let content = await getServerConfigContent();
    content = JSON.parse(content);
    const cipher = await getCipher();
    const result = cipher.encrypt(content);
    await fswriteFile(path.join(root, 'data', 'server_config.json'), result);
}
try {
    run().then(() => {
        process.exit(0);
    });
}
catch (error) {
    process.exit(1);
}
