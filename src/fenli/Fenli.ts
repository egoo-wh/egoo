/**
 * 
分离工具。做下列几件事情：
1. 复制并重命名（项目名后面加“分离后”）整个包；
2. 对html文件(.htm,.html,.shtml,.inc)和css文件内满足[特定规则的内容](#分离规则)。
	- 分离图片。将ossweb-img/images的相对地址转换成cdn地址
	- 去除协议。删除url中的 **http(s):** 部分

#### 分离规则
- css样式的url()，不包含嵌入uri(data:image/...)内的http(s):部分
- html标签href属性值。如下列标签：
	- `<a href .. ></a>`
	- `<link href ... >`
	- `<base href ... >`
	- ...
- html标签src属性值。如下列标签：
	- `<video src ... ></video>`
	- `<audio src ... ></audio>`
	- `<script src ... ></script>`
	- `<video><source src ... /></video>`
	- `<iframe src ... ></iframe>`
	- ...
 */

import path from 'path';
import Handler from '../Handler';
import fetch from 'node-fetch';
import _ from 'lodash';
import { walkFile, cp } from '../utils/asyncs';
import { PatchInstaller } from "../core/patch";
import DeleteProtocolPatch from './patchs/DeleteProtocolPatch';
import FenliPatch from './patchs/FenliPatch';
import { logger, logMsg } from '../utils';

const log = logger('Fenli')
const PROJECT_SUFFIX = '分离后';

interface FenliAddr {
  "name": string,
  "url": string,
  "product": string[]
}

export default class Fenli extends Handler {

  private sources: string[];
  private forceHttps: boolean;
  private fenliPath: string;
  private patchInstaller: PatchInstaller;
	/**
	 * 
	 * @param {*} source 
	 * @param {*} aliases 分离路径的别名
	 * @param {*} url 分离路径的完整URL地址
	 * @param {*} forceHttps 是否强制Https
	 */
  constructor(sources, forceHttps = false) {
    super();

    this.sources = sources;
    this.forceHttps = forceHttps;
  }

  async run(aliases, url) {
    try {
      await this.init(aliases, url);
      await this.start();
      log(logMsg('fenli success.', 'SUCCESS'));
    } catch (error: any) {
      log(logMsg('fenli fail.', 'ERROR'));
      log(logMsg(error, 'ERROR'));
      log(error.stack);
      throw error;
    }
  }

  async init(aliases, url) {
    const fenliPath = await this.getFenliPath(aliases, url)
    this.fenliPath = _.trim(fenliPath);
    if (this.forceHttps) {
      this.fenliPath = this.fenliPath.replace(/http(s)?:/, '')
      this.fenliPath = `https:${this.fenliPath}`;
    }
    this.patchInstaller = new PatchInstaller();
    const fp = new FenliPatch();
    const dpp = new DeleteProtocolPatch();
    this.patchInstaller.register(fp);
    this.patchInstaller.register(dpp)
    if (this.forceHttps) {
      dpp.setWaringWhenNotHttps(true);
    }
    return fenliPath;
  }

  async start() {
    return this.sources.reduce(async (promise, source) => {
      try {
        await promise
        log(logMsg(`start ${logMsg(source, 'PATH')}`, 'STEP'));
        await this.startOne(source)
      } catch (error) {
        return Promise.reject(error)
      }
      log(logMsg(`finish ${logMsg(source, 'PATH')}`, "STEP"))
      return Promise.resolve()
    }, Promise.resolve())
  }

  startOne(source) {
    // 如果路径以 / 结尾，则去掉末尾的/ 
    if (source.substr(source.length - 1) === '/') {
      source = source.substr(0, source.length - 1);
    }
    const dest = source + PROJECT_SUFFIX;
    const projectName = path.basename(source);
    (this.patchInstaller.getPatch('FenliPatch') as FenliPatch).setFenliPath(this.fenliPath + projectName);
    return walkFile(source, ({ filePath, type }) => {
      let _d = path.join(dest, path.relative(source, filePath));
      // console.log(_d);
      if (type === 'file') {
        let pi = this.patchInstaller.detectAndAdd(filePath, _d)
        if (pi) {
          log(logMsg(`replace ${logMsg(path.relative(source, filePath), 'PATH')} > ${logMsg(path.relative(source, _d), 'PATH')}`))
          return this.patchInstaller.run(pi);
        } else {
          log(logMsg(`cp ${logMsg(path.relative(source, filePath), 'PATH')} > ${logMsg(path.relative(source, _d), 'PATH')}`))
          return cp(filePath, _d);
        }
      } else {
        log(logMsg(`create dir ${logMsg(path.relative(source, _d), 'PATH')}`));
        return cp(filePath, _d);
      }
    });
  }

	/**
	 * 获取分离路径
	 */
  async getFenliPath(aliases, url): Promise<string> {
    if (aliases) {
      const data = await this.loadFenliData();
      let _u = data.find((o) => o.product.indexOf(aliases.toLowerCase()) >= 0);
      if (_u) { return Promise.resolve(_u.url); }
      else { return Promise.reject(new Error("未找到别名(" + aliases + ")的分离地址")); }
    } else if (url) {
      return Promise.resolve(url);
    } else {
      return Promise.reject(new Error("未指定分离地址"));
    }
  }

	/**
	 * 加载分离数据
	 */
  async loadFenliData(): Promise<FenliAddr[]> {
    log(logMsg('load fenli data.', 'STEP'));
    try {
      const response = await fetch("https://api.egooidea.com/fenli/list");
      if (response.ok) {
        const data = await response.json();
        if (data && data['ret'] == 0) {
          return Promise.resolve(data.data);
        } else {
          log(logMsg('load fenli data error.', 'ERROR'));
          throw new Error("can't load fenli data.");
        }
      } else {
        throw new Error("can't load fenli data.");
      }
    } catch (error) {
      throw error;
    }
  }

  shutdownHandler() {
    log(logMsg('shutdown'));
  }
}