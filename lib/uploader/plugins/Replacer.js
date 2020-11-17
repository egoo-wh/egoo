"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Uploader_1 = require("../Uploader");
const patch_1 = require("../../core/patch");
const path = tslib_1.__importStar(require("path"));
const utils_1 = require("../../utils");
const log = utils_1.logger('Replacer');
/**
 * 上传-文本替换插件
 *
 */
class Replacer {
    /**
     *
     * @param {Booleam} noFilter 是否过滤腾讯登录组件和统计代码
     * @param  {[Boolean]} shtmlReplaced 是否替换shtml include模块
     */
    constructor(uploader, patchs) {
        uploader.hooks.afterInit.tap('ReplacerPlugin', () => {
            this.patchInstaller = new patch_1.PatchInstaller();
            this.patchInstaller.registers(patchs);
        });
        uploader.hooks.query.tapPromise('ReplacerPlugin', (queryInfo, uploadInfo) => {
            return this.onQueryFile(queryInfo, uploadInfo);
        });
        uploader.hooks.afterQuery.tapPromise('ReplacerPlugin', () => {
            return this.patchInstaller.run();
        });
        uploader.hooks.afterUpload.tapPromise('ReplacerPlugin', () => {
            log(utils_1.logMsg('clear', 'STEP'));
            return this.patchInstaller.clear();
        });
        uploader.hooks.dispose.tapPromise('ReplacerPlugin', () => {
            return this.patchInstaller.clear();
        });
    }
    async onQueryFile(queryInfo, uploadInfo) {
        const filePath = queryInfo.src;
        const tempsPath = this.patchInstaller.detectAndAdd(filePath);
        if (tempsPath) {
            let bn = path.basename(filePath);
            let ext = path.extname(bn);
            if (path.basename(filePath, ext) == 'index') {
                uploadInfo.visitor = bn;
            }
            let tempFilePath = tempsPath[0];
            log(utils_1.logMsg(`modify ${tempFilePath}`, 'STEP'));
            return new Uploader_1.QueryInfo(tempFilePath, queryInfo.dest, queryInfo.type);
        }
    }
}
exports.default = Replacer;
