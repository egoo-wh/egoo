import { createRequire } from 'module'
import { promises as fs } from 'fs';
import _ from 'lodash';
import { logger, appRootPathJoin, getLocalURL, getConfigURL, logMsg } from "../utils";

const require = createRequire(import.meta.url)
const log = logger('VersionCtrl');
/**
 * 配置中心的版本控制
 * 按以下数据结构存储版本文件(config_center_versions.json)
 * { ConfigFileName : { ttl } }
 */
export class VersionCtrl {
  static FILENAME = 'config_versions.json';
  private assets: any;
  private included: boolean = false;
  private confPath: string = '';

  constructor() {
    this.confPath = getLocalURL(VersionCtrl.FILENAME);
  }
  init() {
    if (!this.included) {
      try {
        this.assets = require(this.confPath) || {};
        this.included = true
      } catch (err) {
        // no conf file.
        this.assets = { };
      }
    }
  }
  checkUpdate(configName) {
    const ttl = _.get(this.assets, `${configName}.ttl`);
    const now = new Date().getTime();
    if (!ttl || now > ttl) {
      return true;
    } else {
      return false;
    }
  }
  save(configName) {
    const now = new Date().getTime();
    const expireDays = 2;
    const expireTime = expireDays * (60 * 60 * 24) * 1000;
    _.set(this.assets, `${configName}.ttl`, now + expireTime)
    if (this.assets) {
      log(logMsg('save conf.', 'STEP'));
      return fs.writeFile(this.confPath, JSON.stringify(this.assets));
    } else {
      return Promise.resolve()
    }
  }
}