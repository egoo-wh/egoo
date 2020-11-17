"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PatchInfo = exports.Patch = exports.PatchInstaller = void 0;
const tslib_1 = require("tslib");
/**
 * 打补丁——文件修改操作
 * 类似于中间件模式（Middleware Pattern）
 * 每个补丁专注于一次修改。
 *
 * 如：
 * 去除协议补丁(DeleteProtocolPatch)
 * 分离补丁(FenliPatch)
 * HTML敏感代码注释补丁(HTMLCommenterPatch)
 * ServerSideInclude补丁(SSIPatch)
 */
const path = tslib_1.__importStar(require("path"));
const FileUtil_1 = tslib_1.__importDefault(require("../utils/FileUtil"));
const util = tslib_1.__importStar(require("util"));
const fs = tslib_1.__importStar(require("fs"));
const utils_1 = require("../utils");
const log = utils_1.logger('PatchInstaller');
const fsunlink = util.promisify(fs.unlink);
/**
 * 补丁安装器
 */
class PatchInstaller {
    constructor() {
    }
    register(patch) {
        if (!this.patchs) {
            this.patchs = [];
        }
        if (this.patchs) {
            const found = this.patchs.some(p => p.name === patch.name);
            if (found) {
                return;
            }
        }
        this.patchs.push(patch);
    }
    registers(patchs) {
        patchs.forEach(p => {
            this.register(p);
        });
    }
    detect(file) {
        return this.patchs.filter(patch => patch.detect(file));
    }
    detectAndAdd(file, dest = null) {
        const patches = this.detect(file);
        if (patches && patches.length > 0) {
            const tempsPath = patches.map(patch => patch.add(file, dest));
            return tempsPath;
        }
    }
    async run() {
        if (!this.patchs) {
            return null;
        }
        // 执行所有补丁prepare
        await Promise.all(this.patchs.map(patch => patch.prepare()));
        const mergedInfos = this.merge();
        this.mergedInfos = mergedInfos;
        return mergedInfos.reduce(async (promise, info) => {
            try {
                await promise;
                // 返回所有Patch的transform操作
                const streams = info.patch.map(patchName => {
                    const patch = this.getPatch(patchName);
                    if (patch) {
                        // log(colors.yellow(`${patch.name} run`));
                        return patch.run(info);
                    }
                    else {
                        return null;
                    }
                });
                // log(colors.yellow(`${info.src} run`));
                // 全部丢给管道操作
                return await FileUtil_1.default.modify(info.src, info.dest, streams);
            }
            catch (error) {
            }
        }, Promise.resolve());
    }
    /**
     * 合并patchs的所有PatchInfo，PatchInfo相等(src和dest相同)则合并。
     */
    merge() {
        return this.patchs.reduce((arr, patch) => {
            if (patch.infos) {
                patch.infos.forEach((info) => {
                    let foundInfo = arr.find(a => a.equal(info));
                    if (foundInfo) {
                        foundInfo.merge(info);
                    }
                    else {
                        arr.push(info.clone());
                    }
                });
            }
            return arr;
        }, []);
    }
    getPatch(name) {
        return this.patchs.find(p => p.name === name);
    }
    /**
     * 清除临时文件
     */
    async clear() {
        if (this.mergedInfos && this.mergedInfos.length > 0) {
            const all = this.mergedInfos.map(async (info) => {
                return await fsunlink(info.dest);
            });
            return Promise.all(all);
        }
    }
}
exports.PatchInstaller = PatchInstaller;
/**
 * 补丁基类
 * 所有补丁都需要继承
 */
class Patch {
    constructor(name) {
        this.name = name;
    }
    /**
     * 加入补丁临时组
     * @param file
     * @param dest 目标路径，如果不指定，则为临时文件(~fileName)，返回目标路径
     * @return 临时文件地址 ~fileName
     */
    add(file, dest = null) {
        if (!this.infos) {
            this.infos = [];
        }
        if (dest) {
            this.infos.push(new PatchInfo(file, dest, [this.name]));
            return dest;
        }
        else {
            let fileName = path.basename(file);
            if (fileName.substr(0, 1) !== '~') {
                let tempPath = path.join(file, '..', '~' + fileName);
                this.infos.push(new PatchInfo(file, tempPath, [this.name]));
                return tempPath;
            }
            else {
                // return '';
                throw new Error("文件不能以~开头，请修改");
            }
        }
    }
    toString() {
        return this.name;
    }
}
exports.Patch = Patch;
/**
 * 补丁文件信息
 */
class PatchInfo {
    constructor(src, dest, patch) {
        this.src = src;
        this.dest = dest;
        this.patch = patch;
    }
    equal(info) {
        return info.src == this.src && info.dest == this.dest;
    }
    merge(info) {
        this.patch = this.patch.concat(info.patch);
    }
    clone() {
        return new PatchInfo(this.src, this.dest, this.patch);
    }
}
exports.PatchInfo = PatchInfo;
