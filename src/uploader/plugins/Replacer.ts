import Uploader, { QueryInfo, UploadInfo } from "../Uploader";
import { Patch, PatchInstaller } from "../../core/patch";
import * as path from 'path';
import { logger, logMsg, serverPathJoin } from "../../utils";

const log = logger('Replacer')

/**
 * 上传-文本替换插件
 * 
 */
export default class Replacer {
  private patchInstaller: PatchInstaller;

  /**
   * 
   * @param {Booleam} noFilter 是否过滤腾讯登录组件和统计代码
   * @param  {[Boolean]} shtmlReplaced 是否替换shtml include模块
   */
  constructor(uploader: Uploader, patchs: Patch[]) {
    uploader.hooks.afterInit.tap('ReplacerPlugin', () => {
      this.patchInstaller = new PatchInstaller();
      this.patchInstaller.registers(patchs);
    })
    uploader.hooks.query.tapPromise('ReplacerPlugin', (queryInfo: QueryInfo, uploadInfo: UploadInfo) => {
      return this.onQueryFile(queryInfo, uploadInfo)
    })
    uploader.hooks.afterQuery.tapPromise('ReplacerPlugin', () => {
      return this.patchInstaller.run();
    })
    uploader.hooks.afterUpload.tapPromise('ReplacerPlugin', () => {
      log(logMsg('clear', 'STEP'));
      return this.patchInstaller.clear();
    })
    uploader.hooks.dispose.tapPromise('ReplacerPlugin', () => {
      return this.patchInstaller.clear();
    })
  }

  async onQueryFile(queryInfo: QueryInfo, uploadInfo: UploadInfo): Promise<QueryInfo | undefined>{
    const filePath = queryInfo.src
    const tempsPath = this.patchInstaller.detectAndAdd(filePath);
    if (tempsPath) {
      let bn = path.basename(filePath);
      let ext = path.extname(bn);
      if (path.basename(filePath, ext) == 'index') { uploadInfo.visitor = bn; }

      let tempFilePath: string = tempsPath[0];
      log(logMsg(`modify ${tempFilePath}`, 'STEP'));
      return new QueryInfo(tempFilePath, queryInfo.dest, queryInfo.type);
    }
  }
}