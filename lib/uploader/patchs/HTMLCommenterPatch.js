"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const log = tslib_1.__importStar(require("fancy-log"));
const colors = tslib_1.__importStar(require("ansi-colors"));
const fs = tslib_1.__importStar(require("fs"));
const fetch = tslib_1.__importStar(require("node-fetch"));
const UserConf_1 = tslib_1.__importDefault(require("../../core/UserConf"));
const readable_stream_1 = require("readable-stream");
const utils_1 = require("../../utils");
const patch_1 = require("../../core/patch");
/**
 * 敏感代码规则文件的管理类，包含下载，引入，检测更新等
 */
class IllegalCodeMgr {
    constructor() {
        // 规则文件地址
        this.filePath = utils_1.getLocalURL(IllegalCodeMgr.FILENAME);
        this.assets = null;
    }
    checkUpdate() {
        let _t = UserConf_1.default.getInstance().get('uploader.illegal_code_update_time');
        if (!_t || new Date().getTime() - _t > IllegalCodeMgr.UPDATE_INTERVAL * 1000) {
            return true;
        }
        else {
            return false;
        }
    }
    // 加载规则文件
    load() {
        if (this.checkUpdate()) {
            return new Promise((resolve, reject) => {
                try {
                    fetch(utils_1.getConfigURL(IllegalCodeMgr.FILENAME), {})
                        .then((res) => {
                        var dest = fs.createWriteStream(this.filePath);
                        res.body.pipe(dest).on("finish", () => {
                            UserConf_1.default.getInstance().add('uploader.illegal_code_update_time', new Date().getTime());
                            resolve(true);
                        });
                    }).catch((err) => {
                        resolve(false);
                    });
                }
                catch (err) {
                    resolve(false);
                    // reject(err);
                }
            });
        }
        else {
            return Promise.resolve(false);
        }
    }
    include() {
        return new Promise((resolve, reject) => {
            try {
                this.assets = require(this.filePath) || {};
                log(IllegalCodeMgr.LOG_NAME, colors.yellow('include illegal code rules.'));
            }
            catch (err) {
                throw err;
            }
            resolve();
        });
    }
    // 获取所有的过滤规则
    async getRules() {
        await UserConf_1.default.getInstance().include();
        const fromURL = await this.load();
        await this.include();
        if (fromURL) {
            await UserConf_1.default.getInstance().save();
        }
        return this.assets['rules'];
    }
}
IllegalCodeMgr.FILENAME = 'illegal_code_manifest.json';
IllegalCodeMgr.LOG_NAME = 'IllegalCodeMgr';
IllegalCodeMgr.UPDATE_INTERVAL = 86400 * 2; // 更新检测的间隔时间 s
/**
 * HTML文件注释类
 * 将一些敏感代码进行注释。
 * 敏感代码为可能引发腾讯电脑管家等软件报恶意网站的代码（如QQ登录组件、统计代码等相关JS）。
 *
 * 敏感代码文件由IllegalCodeMgr.js管理
 */
const needFilterFileExts = ['.html', '.shtml', '.htm'];
class HTMLCommenterPatch extends patch_1.Patch {
    constructor() {
        super('HTMLCommenterPatch');
        this.rules = null;
    }
    async prepare() {
        let icm = new IllegalCodeMgr();
        const rules = await icm.getRules();
        this.rules = rules;
    }
    run(info) {
        var self = this;
        return new readable_stream_1.Transform({
            transform: function (chunk, enc, callback) {
                chunk = self.wrapComment(chunk);
                this.push(chunk);
                callback();
            }
        });
    }
    wrapComment(chunk) {
        const rules = this.rules;
        if (rules) {
            try {
                rules.forEach((pair) => {
                    let pattern = pair['pattern'];
                    if (pattern) {
                        let regexp = new RegExp(pattern, 'g');
                        // don't use regex.test(res).
                        // @see http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
                        // console.log(res);
                        if (chunk.match(regexp)) {
                            chunk = chunk.replace(regexp, pair['replacement']);
                        }
                    }
                });
            }
            catch (err) {
                console.log(err);
            }
        }
        return chunk;
    }
    detect(file) {
        return needFilterFileExts.indexOf(path.extname(file)) >= 0;
    }
}
exports.default = HTMLCommenterPatch;
