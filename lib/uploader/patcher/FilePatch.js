let fs = require('fs');
let _ = require('lodash');
let FileModifier = require('../../core/FileModifier');
let log = require('fancy-log');
let colors = require('ansi-colors');
let util = require('util');

const fsunlink = util.promisify(fs.unlink);
const LOG_NAME = 'FilePatch'

class FilePatch {
  constructor(patchs) {
    this.patchs = patchs;
    this.mergedTemps = null;
  }
  register(patch) {
    if (!this.patchs) {
      this.patchs = []
    }
    this.patchs.push(patch);
  }
  detect(file){
    return this.patchs && this.patchs.some(patch=>patch.detect(file))
  }
  add(file){
    // log(LOG_NAME, colors.yellow('file patch add file.'));
    let r;
    this.patchs.forEach(patch => {
      if (patch.detect(file)) {
        r = patch.add(file);
      }
    });
    return r;
  }
  exec(){
    return Promise.all(this.patchs.map(patch => {
      if (patch.fileTemps) {
        return patch.beforeRun()
      } else {
        return Promise.resolve()
      }
    })).then(()=>{
      let fileTemps = this.patchs.reduce((arr, patch) => {
        // arr.push()
        if (patch.fileTemps) {
          patch.fileTemps.forEach(temp => {
            let ft = arr.find(t => t['src'] == temp['src'] && t['dest'] == temp['dest'])
            if (ft) {
              if (typeof ft['patch'] == 'string') {
                ft['patch'] = [ft['patch']]
              }
              ft['patch'].push(temp['patch'])
            } else {
              arr.push(temp)
            }
          })
        }
        return arr;
      }, []);
      this.mergedTemps = fileTemps;
      let all = _.chain(fileTemps)
        .map(temp => {
          return FileModifier.modify(temp['src'], temp['dest'], res=>{
            return this.patchs.reduce((r, patch) => {
              if (temp['patch'] == patch.name || (
                temp['patch'] instanceof Array &&
                temp['patch'].indexOf(patch.name) >= 0
              )) {
                return patch.run(r)
              } else { return r}
            }, res)
          })
        })
        .value();
      return Promise.all(all);
    })
  }
  /**
   * 清除临时文件
   */
  clear() {
    if (this.mergedTemps && this.mergedTemps.length > 0) {
      let all = _.chain(this.mergedTemps)
        .map((temp) => {
          return fsunlink(temp["dest"]);
        })
        .value();

      return Promise.all(all);
    } else {
      return Promise.resolve();
    }
  }
}
module.exports = FilePatch