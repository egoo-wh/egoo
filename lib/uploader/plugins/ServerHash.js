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
class ServerHash {
    constructor(uploader) {
        // hash文件信息 source 为UploadInfo.source
        this.fileInfos = {};
        uploader.hooks.beforeQuery.tapPromise('ServerHashPlugin', (uinfo) => {
            return this.beforeBuildQuery(uploader, uinfo);
        });
        uploader.hooks.afterQuery.tapPromise('ServerHashPlugin', (uinfo) => {
            return this.afterBuildQuery(uploader, uinfo);
        });
        uploader.hooks.afterUpload.tapPromise('ServerHashPlugin', () => {
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
        const saved = await this.save(uinfo);
        if (saved) {
            const fileInfo = this.fileInfos[uinfo.source];
            uploader.pushQuery(fileInfo.filePath, fileInfo.serverPath, 'file');
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
            const isEqual = await this.compare(filePath, uploadInfo);
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
        const fileInfo = {
            filePath: path.join(localPath, hashCfg.file),
            serverPath: utils_1.serverPathJoin(remotePath, hashCfg.file),
            assets: null,
            saved: false
        };
        this.fileInfos[localPath] = fileInfo;
        // 1.load server hash file
        return asyncs_1.sfcall(sftp.fastGet, sftp, true, fileInfo.serverPath, fileInfo.filePath).then((fileExist) => {
            // 2.include it if file exists.
            if (fileExist) {
                log(utils_1.logMsg('server hash file loaded.', 'STEP'));
                // 转换成绝对路径，require，不然，相对路径会导致报错。
                let absoluteHashFilePath = path.resolve(fileInfo.filePath);
                try {
                    fileInfo.assets = require(absoluteHashFilePath) || {};
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
    save(uinfo) {
        const fileInfo = this.fileInfos[uinfo.source];
        if (fileInfo && fileInfo.assets) {
            return fswriteFile(fileInfo.filePath, JSON.stringify(fileInfo.assets)).then(() => {
                fileInfo.saved = true;
                log(utils_1.logMsg(`save hash file(${fileInfo.filePath}).`, 'STEP'));
                return Promise.resolve(true);
            });
        }
        else {
            return Promise.resolve(false);
        }
    }
    // 清除hash文件
    clear() {
        log(utils_1.logMsg('remove hash files.', 'STEP'));
        const all = Object.values(this.fileInfos).map(info => {
            if (info.saved && info.filePath) {
                return fsunlink(info.filePath);
            }
            else {
                return Promise.resolve();
            }
        });
        return Promise.all(all);
    }
    // 比较文件hash值
    compare(file, uinfo) {
        const fileInfo = this.fileInfos[uinfo.source];
        return fsreadFile(file).then((contents) => {
            // Initialize results object
            let hashValue = '';
            let absoluteFilePath = path.resolve(file);
            // If file was already hashed, get old hash
            if (fileInfo.assets && fileInfo.assets[absoluteFilePath]) {
                hashValue = fileInfo.assets[absoluteFilePath];
            }
            // Generate hash from content
            let newHashValue = this.generateHash(contents);
            // If hash was generated
            if (hashValue !== newHashValue) {
                hashValue = newHashValue;
                if (!fileInfo.assets) {
                    fileInfo.assets = {};
                }
                ;
                // Add file to or update asset library
                fileInfo.assets[absoluteFilePath] = hashValue;
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
