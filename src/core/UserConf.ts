import * as fs from 'fs';
import * as path from 'path';
import * as colors from 'ansi-colors';
import * as util from 'util';
import { logger, logMsg, getLocalURL, appRootPathJoin } from '../utils';

const fslstat = util.promisify(fs.lstat);
const fsmkdir = util.promisify(fs.mkdir);
const fswriteFile = util.promisify(fs.writeFile);

const USER_CONFIG_FILENAME = 'user_conf.json';

const log = logger('UserConf')

/**
 * 管理用户配置
 * UserConfig
 * 单例
 */
export default class UserConf {
  private assets: any;
  private included: boolean;
  private confPath:string;
  private constructor() {
    this.assets = null;
    this.included = false;
    this.confPath = '';
  }

	/**
	 * 使用UserConf时，需首先include.
	 * @return {[type]} [description]
	 */
  include(confFileName: string | null = null) {
    if (!confFileName) {
      this.confPath = getLocalURL(USER_CONFIG_FILENAME);
    } else {
      this.confPath = getLocalURL(confFileName)
    }
    if (!this.included) {
      return this.createDataDir().then((exists) => {
        if (!exists) { log(logMsg("找不到data文件夹", 'ERROR')); return; }
        try {
          this.assets = require(this.confPath) || {};
          log(logMsg('include user conf.', 'STEP'));
        } catch (err) {
          // no user conf file.
        }
        return Promise.resolve();
      })
    } else {
      return Promise.resolve();
    }
  }

  createDataDir(): Promise<boolean> {
    let dataDir = appRootPathJoin('data');
    // return fslstat(dataDir).then(()=>{
    // 	return Promise.resolve();
    // }).catch(()=>{
    // 	return fsmkdir(dataDir, 0o777);
    // })
    return new Promise((resolve, reject) => {
      fs.lstat(dataDir, (err, stats) => {
        if (err) {
          fs.mkdir(dataDir, 0o777, (err) => {
            if (err) { reject(err); }
            else { resolve(true); }
          })
        } else {
          resolve(true);
        }
      })
    })
  }

	/**
	 * 添加配置
	 * @param {[type]} name  属性名 key.subkey...   
	 * @param {[type]} value [description]
	 */
  add(name: string, value: any) {
    if (!this.assets) { this.assets = {}; }
    let keys = name.split('.');
    keys.reduce((result, k, i) => {
      if (i < keys.length - 1) {
        if (!result[k]) {
          result[k] = {};
        }
        return result[k];
      } else {
        result[k] = value;
        return result;
      }
    }, this.assets);
  }

  get(name) {
    let keys = name.split('.');
    return keys.reduce((result, k, i) => {
      return result ? result[k] : null;
    }, this.assets);
  }

  save() {
    if (this.assets) {
      log(logMsg('save user conf.', 'STEP'));
      return fswriteFile(this.confPath, JSON.stringify(this.assets));
    } else {
      return Promise.resolve()
    }
  }

  static __instance;
  public static getInstance(): UserConf {
    if (!UserConf.__instance) {
      UserConf.__instance = new UserConf();
    }
    return UserConf.__instance;
  }
}