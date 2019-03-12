const fs = require('fs');
const path = require('path');
const util = require('util');
let Patcher = require('./Patcher');
let log = require('fancy-log');
let colors = require('ansi-colors');
let _ = require('lodash');
let FileModifier = require('../../core/FileModifier');

const fslstat = util.promisify(fs.lstat);

const LOG_NAME = 'ServerSideInclude'
const INCLUDE_REG = /(<!--\s*#include\s*(virtual|file)\=[\"\'])(.*)[\"\']\s*-->/g;

/**
 * SSI
 * 因为上传到Gitee Pages，不支持SSI功能
 * 所以在上传阶段修改文件,替换include功能，达到SSI目的。
 */
class ServerSideInclude extends Patcher {
  constructor() {
    super();
    this.name = 'ServerSideInclude';
    this.includeFileContents = null;
    this.includeContents = null;
  }
  detect(file){
    return path.extname(file) === ".shtml"
  }
  beforeRun(){
    return this.getIncludeFileContents()
  }
  run(res){
    return this.replaceSSI(res);
  }
  /**
	 * 替换server side include
	 * @return {[type]} [description]
	 */
  replaceSSI(res) {
    log(LOG_NAME, colors.yellow('server side include.'));
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

	/**
	 * 获取shtml文件中include的文件内容，以便后面替换
	 * @return {[type]} [description]
	 */
  getIncludeFileContents() {
    log(LOG_NAME, colors.yellow('get include contents'));
    let all = _.chain(this.fileTemps)
      .filter((temp) => {
        return path.extname(temp["src"]) === ".shtml";
      })
      .map((temp) => {
        // console.log(temp);
        return new Promise((resolve, reject) => {
          FileModifier.read(temp["src"], (contents) => {

            let match;
            let _includes = [];
            while ((match = INCLUDE_REG.exec(contents)) !== null) {
              let includeFile = match && match[3];
              // console.log(includeFile);
              if (includeFile) {
                let includeFilePath = path.join(path.dirname(temp["src"]), includeFile);
                if (includeFilePath) {
                  // console.log(includeFilePath);
                  // 获取include文件内容
                  let p = fslstat(includeFilePath).then((stat) => {
                    return FileModifier.read(includeFilePath, (includeContents) => {
                      if (!this.includeContents) { this.includeContents = {}; }
                      this.includeContents[includeFile] = includeContents;
                      log(LOG_NAME, colors.yellow('get include content ' + includeFile));
                    });
                  }).catch((err) => {
                    reject(err);
                  });
                  _includes.push(p);
                } else {
                  reject(new Error("include file can't found."));
                }
              }
            }
            Promise.all(_includes).then(() => {
              resolve();
            });
          })
        })
      })
      .value();
    return Promise.all(all);
  }
}
module.exports = ServerSideInclude