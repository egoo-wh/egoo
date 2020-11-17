#!/usr/bin/env node
"use strict";
// 从加密后的服务器配置文件(server_config.json)获取服务器配置数据
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = require('path');
const fs = require('fs');
const os = require('os');
const util = require('util');
let Transform = require("stream").Transform;
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
async function run() {
    let contents = await fsreadFile(path.join(root, 'data', 'server_config.json'), 'utf8');
    contents = JSON.parse(contents);
    const cipher = await getCipher();
    let r = cipher.decrypt(contents);
    return r;
}
try {
    run().then((r) => {
        console.log(r);
        process.exit(0);
    });
}
catch (error) {
    process.exit(1);
}
