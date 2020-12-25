"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
const util = tslib_1.__importStar(require("util"));
const utils_1 = require("../utils");
const fslstat = util.promisify(fs.lstat);
const fsmkdir = util.promisify(fs.mkdir);
const fswriteFile = util.promisify(fs.writeFile);
const USER_CONFIG_FILENAME = 'user_conf.json';
const log = utils_1.logger('UserConf');
/**
 * 管理用户配置
 * UserConfig
 * 单例
 */
class UserConf {
    constructor() {
        this.assets = null;
        this.included = false;
        this.confPath = '';
    }
    /**
     * 使用UserConf时，需首先include.
     * @return {[type]} [description]
     */
    include(confFileName = null) {
        if (!confFileName) {
            this.confPath = utils_1.getLocalURL(USER_CONFIG_FILENAME);
        }
        else {
            this.confPath = utils_1.getLocalURL(confFileName);
        }
        if (!this.included) {
            return this.createDataDir().then((exists) => {
                if (!exists) {
                    log(utils_1.logMsg("找不到data文件夹", 'ERROR'));
                    return;
                }
                try {
                    this.assets = require(this.confPath) || {};
                    log(utils_1.logMsg('include user conf.', 'STEP'));
                }
                catch (err) {
                    // no user conf file.
                }
                return Promise.resolve();
            });
        }
        else {
            return Promise.resolve();
        }
    }
    createDataDir() {
        let dataDir = utils_1.appRootPathJoin('data');
        // return fslstat(dataDir).then(()=>{
        // 	return Promise.resolve();
        // }).catch(()=>{
        // 	return fsmkdir(dataDir, 0o777);
        // })
        return new Promise((resolve, reject) => {
            fs.lstat(dataDir, (err, stats) => {
                if (err) {
                    fs.mkdir(dataDir, 0o777, (err) => {
                        if (err) {
                            reject(err);
                        }
                        else {
                            resolve(true);
                        }
                    });
                }
                else {
                    resolve(true);
                }
            });
        });
    }
    /**
     * 添加配置
     * @param {[type]} name  属性名 key.subkey...
     * @param {[type]} value [description]
     */
    add(name, value) {
        if (!this.assets) {
            this.assets = {};
        }
        let keys = name.split('.');
        keys.reduce((result, k, i) => {
            if (i < keys.length - 1) {
                if (!result[k]) {
                    result[k] = {};
                }
                return result[k];
            }
            else {
                result[k] = value;
                return result;
            }
        }, this.assets);
    }
    get(name) {
        let keys = name.split('.');
        return keys.reduce((result, k, i) => {
            return result ? result[k] : null;
        }, this.assets);
    }
    save() {
        if (this.assets) {
            log(utils_1.logMsg('save user conf.', 'STEP'));
            return fswriteFile(this.confPath, JSON.stringify(this.assets));
        }
        else {
            return Promise.resolve();
        }
    }
    static getInstance() {
        if (!UserConf.__instance) {
            UserConf.__instance = new UserConf();
        }
        return UserConf.__instance;
    }
}
exports.default = UserConf;
