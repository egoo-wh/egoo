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
        // 补丁文件存放临时组
        this.infos = [];
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
    add(patchs, file, dest = null) {
        if (this.infos.some(info => info.src.indexOf(file) >= 0)) {
            throw new Error("重复add，请检查");
        }
        let pi;
        if (dest) {
            pi = new PatchInfo(file, dest, []);
        }
        else {
            let fileName = path.basename(file);
            if (fileName.substr(0, 1) !== '~') {
                let tempPath = path.join(file, '..', '~' + fileName);
                pi = new PatchInfo(file, tempPath, []);
                pi.isTempFileDest = true;
            }
            else {
                // return '';
                throw new Error(`文件不能以~开头，请修改 ${file}`);
            }
        }
        pi.patchs = patchs;
        this.infos.push(pi);
        return pi;
    }
    /**
     * 检测并添加
     * @param file
     * @param dest 目标路径，如果不指定，则为临时文件(~fileName)
     */
    detectAndAdd(file, dest = null) {
        let patchs = this.detect(file);
        if (patchs && patchs.length > 0) {
            return this.add(patchs, file, dest);
        }
        return null;
    }
    async run(info) {
        // 返回所有Patch的替换操作
        const replacements = info.patchs.map(patch => {
            return patch.run(info);
        });
        // log(colors.yellow(`${info.src} run`));
        return await FileUtil_1.default.modify(info.src, info.dest, replacements);
    }
    async runAll() {
        const all = this.infos.map(info => {
            return this.run(info);
        });
        return Promise.resolve(all);
    }
    getPatch(name) {
        return this.patchs.find(p => p.name === name);
    }
    /**
     * 清除临时文件
     */
    async clear() {
        const all = this.infos.map(async (info) => {
            if (info.isTempFileDest) {
                return await fsunlink(info.dest);
            }
            else {
                return Promise.resolve();
            }
        });
        return Promise.all(all);
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
    toString() {
        return this.name;
    }
}
exports.Patch = Patch;
/**
 * 补丁文件信息
 */
class PatchInfo {
    constructor(src, dest, patchs) {
        this.isTempFileDest = false;
        this.src = src;
        this.dest = dest;
        this.patchs = patchs;
    }
    equal(info) {
        return info.src == this.src && info.dest == this.dest;
    }
    merge(info) {
        this.patchs = this.patchs.concat(info.patchs);
    }
    clone() {
        return new PatchInfo(this.src, this.dest, this.patchs);
    }
}
exports.PatchInfo = PatchInfo;
