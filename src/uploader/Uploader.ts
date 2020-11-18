import * as fs from 'fs';
import * as path from 'path';
import * as log from 'fancy-log';
import * as util from 'util';
import { Client, SFTPWrapper } from 'ssh2';
import Handler from '../Handler';
import SSHClient from '../core/SSHClient';
import { walkFile, sfcall } from '../utils/asyncs';
import { logger, logMsg, serverPathJoin } from '../utils';
import { AsyncSeriesHook, AsyncSeriesBailHook, AsyncHook } from 'tapable';
import { ConfCenter } from '../core/ConfCenter';
import GitMode from './plugins/GitMode';
import ServerHash from './plugins/ServerHash';
import Replacer from './plugins/Replacer';
import { Patch } from '../core/patch';
import InjectedFilePatch from './patchs/InjectedFilePatch';
import ReplacementPatch from './patchs/ReplacementPatch';

const fslstat = util.promisify(fs.lstat);
const log = logger('Uploader');

export interface UploadConfig {
  version: string,
  baseUrl: {
    git: string,
    normal: string
  },
  injected: {
    path: string
  },
  replacements: {
    ext: string,
    rules: { pattern: string, replace: string }[]
  }[]
}
/**
 * 上传列表单个信息
 */
export class QueryInfo {
  public src: string;
  public dest: string;
  public type: string
  /**
   * 上传文件信息
   * @param  {[String]} src  原路径
   * @param  {[String]} dest 目标路径
   * @param  {[String]} type 文件类型 dir/file
   * @return {[type]}      [description]
   */
  constructor(src: string, dest: string, type: string) {
    this.src = src;
    this.dest = dest;
    this.type = type;
  }

  toString() {
    return this.src + " > " + this.dest;
  }
}

export class UploadInfo {
  public source: string;  // 本地路径
  public remote: string;  // 远程服务器路径
  public type: string; // file|dir
  public visitor: string; // 访问文件
  constructor(source: string, remote: string, type: string) {
    this.source = source;
    this.remote = remote;
    this.type = type
  }
}

/**
 * 文件上传类
 */
export default class Uploader extends Handler {
  private uploads: UploadInfo[];
  private querys: QueryInfo[];
  public sftp: SFTPWrapper;
  public ssh: SSHClient;

  public remotePath: string;
  public previewUrl: string;

  public isFile: boolean;

  public hooks: { [name: string]: AsyncHook<any, any> } = {};

  /**
   * @param  {[String]}	localPath 	本地路径
   * @param  {[String]}	remotePath 	要上传的路径
   */
  constructor() {
    super();

    this.hooks = {
      beforeInit: new AsyncSeriesHook(),
      afterInit: new AsyncSeriesHook(),
      beforeQuery: new AsyncSeriesHook(['uinfo']),
      query: new AsyncSeriesBailHook(['qinfo', 'info']),
      afterQuery: new AsyncSeriesHook(['uinfo']),
      beforeUpload: new AsyncSeriesHook(['uinfo']),
      afterUpload: new AsyncSeriesHook(['uinfo']),
      complete: new AsyncSeriesHook(),
      dispose: new AsyncSeriesHook()
    }

    this.uploads = [];
    this.querys = []; // 上传队列
    // this.sftp = undefined; // ssh2 sftp
    // this.ssh = undefined;
  }
  async run(sources: string[], mode, ignores, configForceReload) {
    try {
      await this.init(sources, mode, ignores, configForceReload);
      await this.connect();
      await this.start();
      await this.close();
      log(logMsg('publish success.', 'SUCCESS'));
      log(logMsg('preview url: ' + logMsg(
        this.getPreviewURLs().join(',')
      , 'UNDERLINE')));
    } catch (error) {
      log(logMsg('publish fail.', 'ERROR'));
      log(logMsg(error, 'ERROR'));
      log(error.stack);
      process.exit(1);
    }
  }
  /**
   * 初始化
   * 
   */
  async init(sources: string[], mode, ignores, configForceReload = false) {
    await ConfCenter.getInstance().include('upload_config', configForceReload);
    const uploadMode = ConfCenter.getInstance().get('upload_config', `mode.${mode}`);
    try {
      this.remotePath = uploadMode['remoteRootPath'];
      this.previewUrl = uploadMode['previewBaseUrl'];
    } catch (error) {
      throw new Error("配置文件mode中找不到remoteRootPath和previewBaseUrl，请检查");
    }

    let patchs: Patch[] = [];
    if (uploadMode.replaced || !ignores['replaced']) {
      patchs.push(new ReplacementPatch())
    }
    if (uploadMode.injected || !ignores['injected']) {
      patchs.push(new InjectedFilePatch())
    }
    // if (uploadMode.ssi || !ignores['ssi']) {
    //   patchs.push(new ServerSideInclude());
    // }
    new Replacer(this, patchs);

    if (!ignores['cache']) {
      new ServerHash(this)
    }
    if (mode.toLowerCase() == 'git') {
      new GitMode(this)
    }

    await this.hooks.beforeInit.promise();
    this.uploads = await this.isSourcesValid(sources, this.remotePath);
    await this.hooks.afterInit.promise();
  }

  /**
   * 
   * @param  {[String]} serverConfigPath  配置文件地址，默认为http://192.168.1.11/static/server_config.json
   */
  async connect(serverConfigPath = null) {
    this.ssh = new SSHClient(serverConfigPath);
    const conf = await this.ssh.loadServerConfig();
    await this.ssh.connect()
    this.sftp = await this.ssh.openSFTP();
    return this.ssh;
  }

  async close() {
    return await this.ssh.close()
  }

  getPreviewURLs() {
    return this.uploads.map(uinfo => {
      return this.previewUrl + path.basename(uinfo.source) + '/' + (uinfo.visitor || '')
    })
  }

  async start() {
    return this.uploads.reduce(async (promise, uinfo) => {
      try {
        await promise;
        await this.hooks.beforeQuery.promise(uinfo);
        await this.buildQuery(uinfo);
        await this.hooks.afterQuery.promise(uinfo);
        await this.hooks.beforeUpload.promise(uinfo);
        await this.uploadQuerys(this.sftp, this.querys)
        await this.hooks.afterUpload.promise(uinfo);
        return Promise.resolve();
      } catch (err) {
        throw err;
      }
    }, Promise.resolve()).then(() => {
      return this.hooks.complete.promise()
    })
  }

  // 判断本地待上传的文件路径是否合法
  async isSourcesValid(sources: string[], remotePath: string) {
    const result: UploadInfo[] = []
    return sources.reduce(async (promise, source) => {
      const arr = await promise;
      let stats
      try {
        stats = await fslstat(source)
      } catch (error) {
        log(logMsg(`上传路径:${source} 不正确`, 'ERROR'))
        throw error;
      }

      let info;
      if (stats.isDirectory()) {
        info = new UploadInfo(source, serverPathJoin(remotePath, path.basename(source)), 'dir');
      } else {
        info = new UploadInfo(source, remotePath, 'file')
      }
      arr.push(info);
      return arr;
    }, Promise.resolve(result));
  }

  pushQuery(src, dest, type) {
    this.querys.push(new QueryInfo(src, dest, type))
  }

  // 创建上传队列
  buildQuery(info: UploadInfo) {
    return walkFile(info.source, async ({ filePath, type }) => {
      // console.log("path:"+filePath+" type:"+type);
      let basename = path.basename(info.source)
      let pathItems = path.relative(info.source, filePath).split(path.sep);
      const dest = serverPathJoin(this.remotePath, basename, pathItems);
      let qinfo = new QueryInfo(filePath, dest, type)

      if (type == 'dir') {
        this.querys.push(qinfo);
      } else {
        // 根据patch的返回值，有值则加入上传队列
        const newQueryInfo = await this.hooks.query.promise(qinfo, info);
        if (newQueryInfo) {
          // console.log(newQueryInfo)
          qinfo = newQueryInfo
          this.querys.push(qinfo);
        }
      }
    });
  }
  // 上传队列
  uploadQuerys(sftp, querys) {
    log(logMsg('query load start.', 'STEP'))
    return new Promise((resolve, reject) => {
      this.uploadQuery(sftp, querys, 0)
        .then((finish) => {
          if (finish) {
            log(logMsg('query upload finish.', 'STEP'))
            resolve();
          } else {
            reject('query upload errors somewhere.');
          }
        })
        .catch((err) => {
          reject(err);
        });
    });
  }
  // 上传队列中的单独项
  uploadQuery(sftp, query, loadIndex) {
    if (loadIndex === query.length) {
      query = null;
      return true;
    };

    let { src, dest, type } = query[loadIndex];
    let p;
    if (type === 'dir') {
      p = sfcall(sftp.opendir, sftp, true, dest).then((dirExists) => {
        if (!dirExists) {
          log(logMsg('mkdir: ' + logMsg(dest, 'PATH')))
          // mkdir.
          return sfcall(sftp.mkdir, sftp, false, dest);
        } else {
          return dirExists;
        }
      }).then((dirExists) => {
        if (!dirExists) {
          // change dir file mode. so can put files into it.
          log(logMsg('chmod directory: ' + logMsg(dest, 'PATH')))
          return sfcall(sftp.chmod, sftp, false, dest, '0777');
        }
      }).then(() => {
        // upload complete. next.
        loadIndex++;
        return this.uploadQuery(sftp, query, loadIndex);
      })
    } else if (type === 'file') {
      p = sfcall(sftp.open, sftp, true, dest, 'r').then((fileExists) => {
        // if file exist, delete it.
        if (fileExists) {
          log(logMsg('rm: ' + logMsg(dest, 'PATH')))
          return sfcall(sftp.unlink, sftp, false, dest);
        };
      }).then(() => {
        // upload file.
        log(logMsg('cp: ' + logMsg(src, 'PATH') + ' > ' + logMsg(dest, "PATH")));
        return sfcall(sftp.fastPut, sftp, false, src, dest);
      }).then(() => {
        // upload complete. next.
        loadIndex++;
        return this.uploadQuery(sftp, query, loadIndex);
      });
    }
    return p;
  }

  // 强制停止(ctrl-c)的处理。一些清除操作。
  shutdownHandler() {
    this.hooks.dispose.promise();
  }
}