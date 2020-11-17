"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionCtrl = void 0;
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const utils_1 = require("../utils");
const util = tslib_1.__importStar(require("util"));
const log = utils_1.logger('VersionCtrl');
const fswriteFile = util.promisify(fs.writeFile);
/**
 * 配置中心的版本控制
 * 按以下数据结构存储版本文件(config_center_versions.json)
 * { ConfigFileName : { ttl } }
 */
class VersionCtrl {
    constructor() {
        this.included = false;
        this.confPath = '';
        this.confPath = utils_1.getLocalURL(VersionCtrl.FILENAME);
    }
    init() {
        if (!this.included) {
            try {
                this.assets = require(this.confPath) || {};
                this.included = true;
            }
            catch (err) {
                // no conf file.
                this.assets = {};
            }
        }
    }
    checkUpdate(configName) {
        const ttl = _.get(this.assets, `${configName}.ttl`);
        const now = new Date().getTime();
        if (!ttl || now > ttl) {
            return true;
        }
        else {
            return false;
        }
    }
    save(configName) {
        const now = new Date().getTime();
        const expireDays = 2;
        const expireTime = expireDays * (60 * 60 * 24) * 1000;
        _.set(this.assets, `${configName}.ttl`, now + expireTime);
        if (this.assets) {
            log(utils_1.logMsg('save conf.', 'STEP'));
            return fswriteFile(this.confPath, JSON.stringify(this.assets));
        }
        else {
            return Promise.resolve();
        }
    }
}
exports.VersionCtrl = VersionCtrl;
VersionCtrl.FILENAME = 'config_versions.json';
