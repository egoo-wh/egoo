"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fs = tslib_1.__importStar(require("fs"));
const path = tslib_1.__importStar(require("path"));
const crypto = tslib_1.__importStar(require("crypto"));
const util = tslib_1.__importStar(require("util"));
const utils_1 = require("../../utils");
const asyncs_1 = require("../../utils/asyncs");
const log = utils_1.logger('ServerHash');
const fsunlink = util.promisify(fs.unlink);
const fsreadFile = util.promisify(fs.readFile);
const fswriteFile = util.promisify(fs.writeFile);
const hashCfg = {
    hasher: 'md5',
    hashKey: '',
    length: 32,
    file: 'filehash.json'
};
/**
 * 上传-文本Hash对比类
 * 对比本地文件与服务器文件，一样则不上传，否则上传。需过滤的文件排除在外，总是上传。
 * 步骤：
 * 1.服务器下载hash文件
 * 2.解析hash文件
 * 3.本地文件生成hash值
 * 4.与本地文件hash对比，对比不同则加入上传列表
 * 5.所有hash值写入hash文件
 * 6.hash文件上传至服务器
 * 7.删除本地hash文件
 */
class ServerHash {
    /**
     * 是否不使用缓存
     * @param  {Boolean} noCache [description]
     * @return {[type]}          [description]
     */
    constructor(uploader, noCache = false) {
        this.noCache = false;
        this.hashLoaded = false;
        this.hashFileSaved = false;
        this.noCache = noCache;
        // this.hashLoaded = false;
        // this.hashFileSaved = false;
        // this.hashAssets = undefined;
        // this.hashFilePath = undefined;
        // this.hashServerPath = undefined;
        uploader.hooks.beforeQuery.tapPromise('ServerHashPlugin', (uinfo) => {
            return this.beforeBuildQuery(uploader, uinfo);
        });
        uploader.hooks.afterQuery.tapPromise('ServerHashPlugin', (uinfo) => {
            return this.afterBuildQuery(uploader, uinfo);
        });
        uploader.hooks.afterUpload.tapPromise('ServerHashPlugin', (uinfo) => {
            return this.afterUploadQuery();
        });
        uploader.hooks.query.tapPromise('ServerHashPlugin', (queryInfo, uploadInfo) => {
            return this.onQueryFile(queryInfo, uploadInfo);
        });
        uploader.hooks.dispose.tapPromise('ServerHashPlugin', () => {
            return this.clear();
        });
    }
    /**
     * 创建上传列表之前，从服务器加载hash文件
     * @param uploader
     * @param uinfo
     */
    async beforeBuildQuery(uploader, uinfo) {
        await this.include(uploader.sftp, uinfo.source, uinfo.remote);
    }
    /**
     * 创建上传列表之后，将保存的hash文件加入上传列表，上传至服务器
     * @param uploader
     * @param uinfo
     */
    async afterBuildQuery(uploader, uinfo) {
        const saved = await this.save();
        if (saved) {
            uploader.pushQuery(this.hashFilePath, this.hashServerPath, 'file');
        }
    }
    /**
     * 上传完成之后，清空本地hash文件
     */
    async afterUploadQuery() {
        await this.clear();
    }
    async onQueryFile(queryInfo, uploadInfo) {
        const filePath = queryInfo.src;
        if (this.isNotHashFile(filePath)) {
            // hash compare.对比文件hash，只上传hash值不同的文件。
            const isEqual = await this.compare(filePath);
            if (!isEqual) {
                return queryInfo;
            }
            else {
                log(utils_1.logMsg('skip: ' + utils_1.logMsg(filePath, 'PATH')));
            }
        }
    }
    // 从服务器加载并载入hash文件。
    include(sftp, localPath, remotePath) {
        if (this.noCache) {
            return Promise.resolve();
        }
        this.hashFilePath = path.join(localPath, hashCfg.file);
        this.hashServerPath = utils_1.serverPathJoin(remotePath, hashCfg.file);
        // 1.load server hash file
        return asyncs_1.sfcall(sftp.fastGet, sftp, true, this.hashServerPath, this.hashFilePath).then((fileExist) => {
            // 2.include it if file exists.
            if (fileExist) {
                log(utils_1.logMsg('server hash file loaded.', 'STEP'));
                // 转换成绝对路径，require，不然，相对路径会导致报错。
                let absoluteHashFilePath = path.resolve(this.hashFilePath);
                try {
                    this.hashAssets = require(absoluteHashFilePath) || {};
                    log(utils_1.logMsg('include hash file.', 'STEP'));
                }
                catch (err) {
                    Promise.reject(new Error('require hash file error.'));
                }
                return Promise.resolve();
            }
            else {
                log(utils_1.logMsg("server hash file isn't exists.", 'STEP'));
                return Promise.resolve();
            }
        });
    }
    // 保存hash文件
    save() {
        if (this.noCache || !this.hashAssets) {
            return Promise.resolve(false);
        }
        return fswriteFile(this.hashFilePath, JSON.stringify(this.hashAssets)).then(() => {
            this.hashFileSaved = true;
            log(utils_1.logMsg(`save hash file(${hashCfg.file}).`, 'STEP'));
            return Promise.resolve(true);
        });
    }
    // 清除hash文件
    clear() {
        if (this.noCache) {
            return Promise.resolve();
        }
        if (this.hashFileSaved && this.hashFilePath) {
            log(utils_1.logMsg('remove hash file.', 'STEP'));
            return fsunlink(this.hashFilePath);
        }
        else {
            return Promise.resolve();
        }
    }
    // 比较文件hash值
    compare(file) {
        if (this.noCache) {
            return Promise.resolve(false);
        }
        return fsreadFile(file).then((contents) => {
            // Initialize results object
            let hashValue = '';
            let absoluteFilePath = path.resolve(file);
            // If file was already hashed, get old hash
            if (this.hashAssets && this.hashAssets[absoluteFilePath]) {
                hashValue = this.hashAssets[absoluteFilePath];
            }
            // Generate hash from content
            let newHashValue = this.generateHash(contents);
            // If hash was generated
            if (hashValue !== newHashValue) {
                hashValue = newHashValue;
                if (!this.hashAssets) {
                    this.hashAssets = {};
                }
                ;
                // Add file to or update asset library
                this.hashAssets[absoluteFilePath] = hashValue;
                return Promise.resolve(false);
            }
            return Promise.resolve(true);
        });
    }
    // 生成hash值
    generateHash(contents) {
        if (contents) {
            return hashCfg.hashKey + crypto.createHash(hashCfg.hasher).update(contents).digest('hex').slice(0, hashCfg.length);
        }
        return '';
    }
    isNotHashFile(file) {
        return path.basename(file) !== hashCfg.file;
    }
}
exports.default = ServerHash;
