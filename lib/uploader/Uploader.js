"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadInfo = exports.QueryInfo = void 0;
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
const util = tslib_1.__importStar(require("util"));
const Handler_1 = tslib_1.__importDefault(require("../Handler"));
const SSHClient_1 = tslib_1.__importDefault(require("../core/SSHClient"));
const asyncs_1 = require("../utils/asyncs");
const utils_1 = require("../utils");
const tapable_1 = require("tapable");
const ConfCenter_1 = require("../core/ConfCenter");
const GitMode_1 = tslib_1.__importDefault(require("./plugins/GitMode"));
const ServerHash_1 = tslib_1.__importDefault(require("./plugins/ServerHash"));
const Replacer_1 = tslib_1.__importDefault(require("./plugins/Replacer"));
const InjectedFilePatch_1 = tslib_1.__importDefault(require("./patchs/InjectedFilePatch"));
const ReplacementPatch_1 = tslib_1.__importDefault(require("./patchs/ReplacementPatch"));
const fslstat = util.promisify(fs.lstat);
const log = (0, utils_1.logger)('Uploader');
/**
 * 上传列表单个信息
 */
class QueryInfo {
    /**
     * 上传文件信息
     * @param  {[String]} src  原路径
     * @param  {[String]} dest 目标路径
     * @param  {[String]} type 文件类型 dir/file
     * @return {[type]}      [description]
     */
    constructor(src, dest, type) {
        this.src = src;
        this.dest = dest;
        this.type = type;
    }
    toString() {
        return this.src + " > " + this.dest;
    }
}
exports.QueryInfo = QueryInfo;
class UploadInfo {
    constructor(source, remote, type) {
        this.source = source;
        this.remote = remote;
        this.type = type;
    }
}
exports.UploadInfo = UploadInfo;
/**
 * 文件上传类
 */
class Uploader extends Handler_1.default {
    /**
     * @param  {[String]}	localPath 	本地路径
     * @param  {[String]}	remotePath 	要上传的路径
     */
    constructor() {
        super();
        this.hooks = {};
        this.hooks = {
            beforeInit: new tapable_1.AsyncSeriesHook(),
            afterInit: new tapable_1.AsyncSeriesHook(),
            beforeQuery: new tapable_1.AsyncSeriesHook(['uinfo']),
            query: new tapable_1.AsyncSeriesBailHook(['qinfo', 'info']),
            afterQuery: new tapable_1.AsyncSeriesHook(['uinfo']),
            beforeUpload: new tapable_1.AsyncSeriesHook(),
            afterUpload: new tapable_1.AsyncSeriesHook(),
            complete: new tapable_1.AsyncSeriesHook(),
            dispose: new tapable_1.AsyncSeriesHook()
        };
        this.uploads = [];
        this.querys = []; // 上传队列
        // this.sftp = undefined; // ssh2 sftp
        // this.ssh = undefined;
    }
    async run(sources, mode, ignores, configForceReload) {
        try {
            await this.init(sources, mode, ignores, configForceReload);
            await this.connect();
            await this.start();
            await this.close();
            log((0, utils_1.logMsg)('publish success.', 'SUCCESS'));
            log((0, utils_1.logMsg)('preview url: ' + this.getPreviewURLs().map(u => {
                return (0, utils_1.logMsg)(u, 'UNDERLINE');
            }).join(' , ')));
        }
        catch (error) {
            log((0, utils_1.logMsg)('publish fail.', 'ERROR'));
            log((0, utils_1.logMsg)(error, 'ERROR'));
            log(error.stack);
            throw error;
        }
    }
    /**
     * 初始化
     *
     */
    async init(sources, mode, ignores, configForceReload = false) {
        await ConfCenter_1.ConfCenter.getInstance().include('upload_config', configForceReload);
        const uploadMode = ConfCenter_1.ConfCenter.getInstance().get('upload_config', `mode.${mode}`);
        try {
            this.remotePath = uploadMode['remoteRootPath'];
            this.previewUrl = uploadMode['previewBaseUrl'];
        }
        catch (error) {
            throw new Error("配置文件mode中找不到remoteRootPath和previewBaseUrl，请检查");
        }
        let patchs = [];
        if (uploadMode.replaced && !ignores['replaced']) {
            patchs.push(new ReplacementPatch_1.default());
        }
        if (uploadMode.injected && !ignores['injected']) {
            patchs.push(new InjectedFilePatch_1.default());
        }
        // if (uploadMode.ssi || !ignores['ssi']) {
        //   patchs.push(new ServerSideInclude());
        // }
        new Replacer_1.default(this, patchs);
        if (!ignores['cache']) {
            new ServerHash_1.default(this);
        }
        if (mode.toLowerCase() == 'git') {
            new GitMode_1.default(this);
        }
        await this.hooks.beforeInit.promise();
        this.uploads = await this.isSourcesValid(sources, this.remotePath);
        await this.hooks.afterInit.promise();
    }
    /**
     *
     * @param  {[String]} serverConfigPath  配置文件地址，默认为http://192.168.1.11/static/server_config.json
     */
    async connect(serverConfigPath = null) {
        this.ssh = new SSHClient_1.default(serverConfigPath);
        const conf = await this.ssh.loadServerConfig();
        await this.ssh.connect();
        this.sftp = await this.ssh.openSFTP();
        return this.ssh;
    }
    async close() {
        return await this.ssh.close();
    }
    getPreviewURLs() {
        return this.uploads.map(uinfo => {
            return this.previewUrl + path.basename(uinfo.source) + '/' + (uinfo.visitor || '');
        });
    }
    async start() {
        return this.uploads.reduce(async (promise, uinfo) => {
            try {
                await promise;
                log((0, utils_1.logMsg)(`start query ${(0, utils_1.logMsg)(uinfo.source, 'PATH')}`, "STEP"));
                await this.hooks.beforeQuery.promise(uinfo);
                await this.buildQuery(uinfo);
                await this.hooks.afterQuery.promise(uinfo);
                log((0, utils_1.logMsg)(`finish query ${(0, utils_1.logMsg)(uinfo.source, 'PATH')}`, "STEP"));
                return Promise.resolve();
            }
            catch (error) {
                return Promise.reject(error);
            }
        }, Promise.resolve()).then(async () => {
            await this.hooks.beforeUpload.promise();
            await this.uploadQuerys(this.sftp, this.querys);
            await this.hooks.afterUpload.promise();
        }).then(() => {
            return this.hooks.complete.promise();
        });
    }
    // 判断本地待上传的文件路径是否合法
    async isSourcesValid(sources, remotePath) {
        const result = [];
        return sources.reduce(async (promise, source) => {
            const arr = await promise;
            let stats;
            try {
                stats = await fslstat(source);
            }
            catch (error) {
                log((0, utils_1.logMsg)(`上传路径:${source} 不正确`, 'ERROR'));
                throw error;
            }
            let info;
            if (stats.isDirectory()) {
                info = new UploadInfo(source, (0, utils_1.serverPathJoin)(remotePath, path.basename(source)), 'dir');
            }
            else {
                info = new UploadInfo(source, remotePath, 'file');
            }
            arr.push(info);
            return arr;
        }, Promise.resolve(result));
    }
    pushQuery(src, dest, type) {
        this.querys.push(new QueryInfo(src, dest, type));
    }
    // 创建上传队列
    buildQuery(info) {
        return (0, asyncs_1.walkFile)(info.source, async ({ filePath, type }) => {
            // console.log("path:"+filePath+" type:"+type);
            let basename = path.basename(info.source);
            let pathItems = path.relative(info.source, filePath).split(path.sep);
            const dest = (0, utils_1.serverPathJoin)(this.remotePath, basename, pathItems);
            let qinfo = new QueryInfo(filePath, dest, type);
            if (type == 'dir') {
                this.querys.push(qinfo);
            }
            else {
                // 根据patch的返回值，有值则加入上传队列
                const newQueryInfo = await this.hooks.query.promise(qinfo, info);
                if (newQueryInfo) {
                    // console.log(newQueryInfo)
                    qinfo = newQueryInfo;
                    this.querys.push(qinfo);
                }
            }
        });
    }
    // 上传队列
    uploadQuerys(sftp, querys) {
        log((0, utils_1.logMsg)('start upload query.', 'STEP'));
        return new Promise((resolve, reject) => {
            this.uploadQuery(sftp, querys, 0)
                .then((finish) => {
                if (finish) {
                    log((0, utils_1.logMsg)('finish upload query.', 'STEP'));
                    resolve();
                }
                else {
                    reject('query upload errors somewhere.');
                }
            })
                .catch((err) => {
                reject(err);
            });
        });
    }
    // 上传队列中的单独项
    uploadQuery(sftp, query, loadIndex) {
        if (loadIndex === query.length) {
            query = null;
            return true;
        }
        ;
        let { src, dest, type } = query[loadIndex];
        let p;
        if (type === 'dir') {
            p = (0, asyncs_1.sfcall)(sftp.opendir, sftp, true, dest).then((dirExists) => {
                if (!dirExists) {
                    log((0, utils_1.logMsg)('mkdir: ' + (0, utils_1.logMsg)(dest, 'PATH')));
                    // mkdir.
                    return (0, asyncs_1.sfcall)(sftp.mkdir, sftp, false, dest);
                }
                else {
                    return dirExists;
                }
            }).then((dirExists) => {
                if (!dirExists) {
                    // change dir file mode. so can put files into it.
                    log((0, utils_1.logMsg)('chmod directory: ' + (0, utils_1.logMsg)(dest, 'PATH')));
                    return (0, asyncs_1.sfcall)(sftp.chmod, sftp, false, dest, '0777');
                }
            }).then(() => {
                // upload complete. next.
                loadIndex++;
                return this.uploadQuery(sftp, query, loadIndex);
            });
        }
        else if (type === 'file') {
            p = (0, asyncs_1.sfcall)(sftp.open, sftp, true, dest, 'r').then((fileExists) => {
                // if file exist, delete it.
                if (fileExists) {
                    log((0, utils_1.logMsg)('rm: ' + (0, utils_1.logMsg)(dest, 'PATH')));
                    return (0, asyncs_1.sfcall)(sftp.unlink, sftp, false, dest);
                }
                ;
            }).then(() => {
                // upload file.
                log((0, utils_1.logMsg)('cp: ' + (0, utils_1.logMsg)(src, 'PATH') + ' > ' + (0, utils_1.logMsg)(dest, "PATH")));
                return (0, asyncs_1.sfcall)(sftp.fastPut, sftp, false, src, dest);
            }).then(() => {
                // upload complete. next.
                loadIndex++;
                return this.uploadQuery(sftp, query, loadIndex);
            });
        }
        return p;
    }
    // 强制停止(ctrl-c)的处理。一些清除操作。
    shutdownHandler() {
        this.hooks.dispose.promise();
    }
}
exports.default = Uploader;
