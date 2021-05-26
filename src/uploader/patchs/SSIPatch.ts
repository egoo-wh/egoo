

import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import * as log from 'fancy-log';
import * as colors from 'ansi-colors';
import * as iconv from 'iconv-lite';
import * as _ from 'lodash';
import { logger, logMsg } from '../../utils';
import { Patch } from '../../core/patch';
import FileUtil from '../../utils/FileUtil';

const fslstat = util.promisify(fs.lstat);
const log = logger('SSI')

const INCLUDE_REG = /(<!--\s*#include\s*(virtual|file)\=[\"\'])(.*)[\"\']\s*-->/g;

/**
 * SSI (未使用)
 * 因为上传到Gitee Pages，不支持SSI功能
 * 所以在上传阶段修改文件,替换include功能，达到SSI目的。
 */
export default class SSIPatch extends Patch {
  private includeFileContents: any;
  private includeContents: any;
  constructor() {
    super('SSIPatch');
    this.includeFileContents = null;
    this.includeContents = null;
  }
  detect(file) {
    return path.extname(file) === ".shtml"
  }
  async prepare() {
    return await this.getIncludeFileContents()
  }
  run(res) {
    return this.replaceSSI(res);
  }
  /**
	 * 替换server side include
	 * @return {[type]} [description]
	 */
  replaceSSI(res) {
    log(logMsg('server side include.', 'STEP'));
    res = res.replace(INCLUDE_REG, (match, p1, p2, p3, offset) => {
      // console.log(p3);
      let includeFile = p3;
      if (includeFile && this.includeContents) {
        // console.log(this.includeContents[includeFile]);
        // log(LOG_NAME, colors.yellow('server side include.'));
        return this.includeContents[includeFile];
      }
      return match;
    })
    return res;
  }

  async getIncludeContent(contents) {
    let match;
    let _includes = [];
    while ((match = INCLUDE_REG.exec(contents)) !== null) {
      let includeFile = match && match[3];
      // console.log(includeFile);
      if (includeFile) {
        // let includeFilePath = path.join(path.dirname(temp["src"]), includeFile);
        let includeFilePath = '';
        if (includeFilePath) {
          // console.log(includeFilePath);
          // 获取include文件内容
          let p = fslstat(includeFilePath).then((stat) => {
            return this.getIncludeFileContent(includeFilePath, (contents) => {
              if (!this.includeContents) { this.includeContents = {}; }
              this.includeContents[includeFile] = contents;
              log(logMsg(`get include content ${includeFile}`, 'STEP'));
            });
          }).catch((err) => {
            throw (err);
          });
          // _includes.push(p);
        } else {
          throw (new Error("include file can't found."));
        }
      }
    }
    return Promise.all(_includes)
  }

  /**
   * 获取文件内容，gbk编码的文件
   * @param filePath 
   * @param handler 
   */
  async getIncludeFileContent(filePath, handler) {
    const encoding = await FileUtil.detectFileEncode(filePath);
    if (!iconv.encodingExists(encoding)) {
      throw new Error('unsupport encoding ' + encoding);
    }
    return new Promise((resolve, reject) => {
      let readStream = fs.createReadStream(filePath);
      function onStreamError(err) {
        console.log(err);
        reject(err);
      };
      readStream.on('error', onStreamError);
      readStream.on('data', function (chunk) {
        handler && handler(iconv.decode(chunk as Buffer, encoding));
      });
      readStream.on('close', function (chunk) {
        resolve('');
      })
    })
  }
	/**
	 * 获取shtml文件中include的文件内容，以便后面替换
	 * @return {[type]} [description]
	 */
  async getIncludeFileContents() {
    log(logMsg('get include contents'));
  }
}