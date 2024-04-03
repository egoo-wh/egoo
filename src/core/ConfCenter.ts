import { createRequire } from 'module'
import fs from 'fs';
import _ from 'lodash';
import fetch from 'node-fetch';
import { logger, appRootPathJoin, getLocalURL, getConfigURL, logMsg } from "../utils";
import { VersionCtrl } from './ConfVersionCtrl';
import UserConf from './UserConf';

const require = createRequire(import.meta.url)
const log = logger('ConfCenter');

/**
 * 配置中心
 * 1. 从远程地址下载配置文件。
 * 2. 管理配置文件版本。定期检测版本，有更新则拉取最新配置。
 * 3. 根据配置获取数据
 */
export class ConfCenter {
  private versionCtrl: VersionCtrl;
  private assets: {[configFileName: string]: any } = {};
  private included: boolean = false;

  constructor() {
    this.versionCtrl = new VersionCtrl();
    this.assets = {};
  }
  /**
   * 加载配置文件
   * @param configFileName 配置文件名
   * @param forceReload 是否强制请求，是则忽略本地文件，请求原始地址，否则加载本地文件。
   */
  async include(configFileName:string, forceReload = false): Promise<void> {
    if (!this.included) {
      log(logMsg('include', 'STEP'))
      await UserConf.getInstance().createDataDir();
      await this.versionCtrl.init();
      // 配置文件本地路径
      const confPath = getLocalURL(`${configFileName}.json`);
      if (forceReload || this.versionCtrl.checkUpdate(configFileName)) {
        await this.load(configFileName, confPath);
        await this.versionCtrl.save(configFileName);
      }
      try {
        this.assets[configFileName] = require(confPath) || {};
        this.included = true;
      } catch (err) {
        // no user conf file.
        this.assets[configFileName] = {};
      }
    } else {
      return Promise.resolve();
    }
  }
  async load(configFileName, confPath){
    log(logMsg('load', 'STEP'))
    return new Promise((resolve, reject) => {
      fetch(getConfigURL(`${configFileName}.json`)).then(res => {
        if (res.ok) {
          var dest = fs.createWriteStream(confPath);
          (res.body as any).pipe(dest).on("finish", () => {
            resolve(true);
          });
        } else {
          reject(res.statusText)
        }
      }).catch(err => reject(err));
    })
  }
  get(configFileName, kpath):any {
    const cfg = this.assets[configFileName];
    return cfg ? _.get(cfg, kpath) : null;
  }

  static __instance: ConfCenter;
  public static getInstance(): ConfCenter {
    if (!ConfCenter.__instance) {
      ConfCenter.__instance = new ConfCenter();
    }
    return ConfCenter.__instance;
  }
}

