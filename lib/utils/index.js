"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isUnixHiddenPath = exports.isPromise = exports.isHttpPath = exports.isRelativePath = exports.getLocalURL = exports.getConfigURL = exports.bytesSizeFormat = exports.serverPathJoin = exports.appRootPathJoin = exports.setAppRoot = exports.logger = exports.logMsg = void 0;
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const colors = tslib_1.__importStar(require("ansi-colors"));
const fancylog = tslib_1.__importStar(require("fancy-log"));
// 配置文件基准地址
const CONFIG_URL = 'http://cli.egooidea.com/';
// const CONFIG_URL = 'https://raw.githubusercontent.com/egoo-wh/egoo/master/conf/';
// const CONFIG_URL = 'http://192.168.1.11/static/';
/**
 * 打印
 * colors 使用规范
    表示文件路径 -> cyan
    表示命令行错误/提示 -> red
    表示关键步骤 -> blue
    表示一般提示 -> yellow
    表示成功完成 -> green
 * @param name 打印信息的模块名/标签名
 */
function logMsg(msg, type = '') {
    let fn;
    switch (type) {
        case 'PATH':
            fn = colors.cyan;
            break;
        case 'ERROR':
            fn = colors.red;
            break;
        case 'STEP':
            fn = colors.yellow;
            break;
        case 'TIP':
            fn = colors.magenta;
            break;
        case 'SUCCESS':
            fn = colors.green;
            break;
        case 'UNDERLINE':
            fn = colors.underline;
            break;
        default:
            fn = colors.white;
            break;
    }
    return fn(msg);
}
exports.logMsg = logMsg;
function logger(name) {
    return (...args) => {
        fancylog.info(`${name}: `, ...args);
    };
}
exports.logger = logger;
let appRoot;
function setAppRoot(path) {
    appRoot = path;
}
exports.setAppRoot = setAppRoot;
function appRootPathJoin(...paths) {
    if (!appRoot) {
        throw new Error('use setAppRoot before');
    }
    return path.join(appRoot, ...paths);
}
exports.appRootPathJoin = appRootPathJoin;
/**
 * 用于服务器端连接路径。linux服务器用/连接
 * @param  {...[type]} paths [description]
 * @return {[type]}          [description]
 */
function serverPathJoin(...paths) {
    return paths.reduce((v, p) => {
        let s = '';
        if (typeof p === 'string') {
            s = p;
        }
        else if (Array.isArray(p)) {
            // s = p.join(path.sep);
            s = p.join('/');
        }
        else {
            s = p.toString();
        }
        return v ? v + '/' + s : s;
    }, '');
    // return paths.join('/');
}
exports.serverPathJoin = serverPathJoin;
/**
 * 单位转换
 * @param  {[type]} num [description]
 * @return {[type]}     [description]
 */
function bytesSizeFormat(num) {
    let KB = 1000;
    let MB = Math.pow(KB, 2);
    let GB = Math.pow(KB, 3);
    if (num < KB) {
        return num + '字节';
    }
    else if (KB <= num && num < MB) {
        return Math.floor(num / KB) + "KB";
    }
    else if (MB <= num && num < GB) {
        return Math.floor(num / MB) + "MB";
    }
    else {
        return Math.floor(num / GB) + "GB";
    }
}
exports.bytesSizeFormat = bytesSizeFormat;
function getConfigURL(configFileName) {
    return CONFIG_URL + configFileName;
}
exports.getConfigURL = getConfigURL;
function getLocalURL(configFileName) {
    return appRootPathJoin('data', configFileName);
}
exports.getLocalURL = getLocalURL;
function isRelativePath(p) {
    return !/^((http(s)?|ftp|):)?\/\//i.test(p) && !/^(data:image)/i.test(p) && !/^(data:application)/i.test(p) && !path.isAbsolute(p);
}
exports.isRelativePath = isRelativePath;
function isHttpPath(p) {
    return /^(http(s)?:)?\/\//i.test(p);
}
exports.isHttpPath = isHttpPath;
// https://github.com/then/is-promise
function isPromise(obj) {
    return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}
exports.isPromise = isPromise;
/**
 * Checks whether a path starts with or contains a hidden file or a folder.
 * @param {string} source - The path of the file that needs to be validated.
 * returns {boolean} - `true` if the source is blacklisted and otherwise `false`.
 */
function isUnixHiddenPath(path) {
    return (/(^|\/)\.[^\/\.]/g).test(path);
}
exports.isUnixHiddenPath = isUnixHiddenPath;
;
