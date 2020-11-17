"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfCenter = void 0;
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
const _ = tslib_1.__importStar(require("lodash"));
const fetch = tslib_1.__importStar(require("node-fetch"));
const utils_1 = require("../utils");
const ConfVersionCtrl_1 = require("./ConfVersionCtrl");
const log = utils_1.logger('ConfCenter');
/**
 * 配置中心
 * 1. 从远程地址下载配置文件。
 * 2. 管理配置文件版本。定期检测版本，有更新则拉取最新配置。
 * 3. 根据配置获取数据
 */
class ConfCenter {
    constructor() {
        this.assets = {};
        this.included = false;
        this.versionCtrl = new ConfVersionCtrl_1.VersionCtrl();
        this.assets = {};
    }
    /**
     * 加载配置文件
     * @param configFileName 配置文件名
     * @param forceReload 是否强制请求，是则忽略本地文件，请求原始地址，否则加载本地文件。
     */
    async include(configFileName, forceReload = false) {
        if (!this.included) {
            log(utils_1.logMsg('include', 'STEP'));
            await this.createDataDir();
            await this.versionCtrl.init();
            // 配置文件本地路径
            const confPath = utils_1.getLocalURL(`${configFileName}.json`);
            if (forceReload || this.versionCtrl.checkUpdate(configFileName)) {
                await this.load(configFileName, confPath);
                await this.versionCtrl.save(configFileName);
            }
            try {
                this.assets[configFileName] = require(confPath) || {};
                this.included = true;
            }
            catch (err) {
                // no user conf file.
                this.assets[configFileName] = {};
            }
        }
        else {
            return Promise.resolve();
        }
    }
    async load(configFileName, confPath) {
        log(utils_1.logMsg('load', 'STEP'));
        return new Promise((resolve, reject) => {
            fetch(utils_1.getConfigURL(`${configFileName}.json`)).then(res => {
                if (res.ok) {
                    var dest = fs.createWriteStream(confPath);
                    res.body.pipe(dest).on("finish", () => {
                        resolve(true);
                    });
                }
                else {
                    reject(res.statusText);
                }
            }).catch(err => reject(err));
        });
    }
    get(configFileName, kpath) {
        const cfg = this.assets[configFileName];
        return cfg ? _.get(cfg, kpath) : null;
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
    static getInstance() {
        if (!ConfCenter.__instance) {
            ConfCenter.__instance = new ConfCenter();
        }
        return ConfCenter.__instance;
    }
}
exports.ConfCenter = ConfCenter;
