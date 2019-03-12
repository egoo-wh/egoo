let path = require('path');
let _ = require('lodash');


/**
 * html? 文件修改操作(打补丁)
 * 支持一组操作
 * 1.定义需要过滤的文件类型
 * 2.被修改文件（如index.html），将被修改为~index.html文件。
 * 3.将修改后的~index.html上传到服务器上对应位置的index.html
 * 4.上传结束，清除本地的~index.html文件
 */
class Patcher {
  constructor() {
    // 要修改的文件信息[{src, desc}]
    this.fileTemps = null;
    // need override
    this.name = null;
  }
  /**
   * 添加需修改的文件
   * @param {} file 
   */
  add(file){
    if (!this.fileTemps) { this.fileTemps = []; }
    let fileName = path.basename(file);
    if (fileName.substr(0, 1) !== '~') {
      let tempPath = path.join(file, '..', '~' + fileName);
      this.fileTemps.push({ "src": file, "dest": tempPath, "patch": this.name });
      return tempPath;
    } else {
      return null;
    }
  }
  
  beforeRun(){}
  run(res){ }
  /**
   * 
   * @param {*} file 
   * @return Boolean
   */
  detect(file){

  }
}
module.exports = Patcher