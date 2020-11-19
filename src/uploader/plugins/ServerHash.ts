import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import * as util from 'util';
import Uploader, { UploadInfo, QueryInfo } from "../Uploader";
import { logger, logMsg, serverPathJoin } from '../../utils';
import { sfcall } from '../../utils/asyncs';
import { SFTPWrapper } from 'ssh2';

const log = logger('ServerHash');

const fsunlink = util.promisify(fs.unlink);
const fsreadFile = util.promisify(fs.readFile);
const fswriteFile = util.promisify(fs.writeFile);

const hashCfg = {
  hasher: 'md5', // md5 || sha1
  hashKey: '',
  length: 32,
  file: 'filehash.json'
};

/**
 * 上传-文本Hash对比类
 * 对比本地文件与服务器文件，一样则不上传，否则上传。需过滤的文件排除在外，总是上传。
 * 步骤：
 * 1.服务器下载hash文件
 * 2.解析hash文件
 * 3.本地文件生成hash值
 * 4.与本地文件hash对比，对比不同则加入上传列表
 * 5.所有hash值写入hash文件
 * 6.hash文件上传至服务器
 * 7.删除本地hash文件
 */
interface HashFileInfo {
  assets: any, // 文件内容  
  saved: boolean,  // 文件是否保存
  filePath: string, // 文件的本地路径
  serverPath: string // 文件的服务器路径
}
export default class ServerHash {
  // hash文件信息 source 为UploadInfo.source
  private fileInfos: { [source: string]: HashFileInfo } = {};

  constructor(uploader:Uploader) {
    uploader.hooks.beforeQuery.tapPromise('ServerHashPlugin', (uinfo) => {
      return this.beforeBuildQuery(uploader, uinfo);
    })
    uploader.hooks.afterQuery.tapPromise('ServerHashPlugin', (uinfo) => {
      return this.afterBuildQuery(uploader, uinfo);
    })
    uploader.hooks.afterUpload.tapPromise('ServerHashPlugin', () => {
      return this.afterUploadQuery();
    })
    uploader.hooks.query.tapPromise('ServerHashPlugin', (queryInfo: QueryInfo, uploadInfo: UploadInfo) => {
      return this.onQueryFile(queryInfo, uploadInfo)
    })
    uploader.hooks.dispose.tapPromise('ServerHashPlugin', () => {
      return this.clear();
    })
  }

  /**
   * 创建上传列表之前，从服务器加载hash文件
   * @param uploader 
   * @param uinfo 
   */
  async beforeBuildQuery(uploader: Uploader, uinfo: UploadInfo) {
    await this.include(uploader.sftp, uinfo.source, uinfo.remote);
  }

  /**
   * 创建上传列表之后，将保存的hash文件加入上传列表，上传至服务器
   * @param uploader 
   * @param uinfo 
   */
  async afterBuildQuery(uploader: Uploader, uinfo: UploadInfo) {
    const saved = await this.save(uinfo);
    if (saved) {
      const fileInfo = this.fileInfos[uinfo.source]
      uploader.pushQuery(fileInfo.filePath, fileInfo.serverPath, 'file');
    }
  }

  /**
   * 上传完成之后，清空本地hash文件
   */
  async afterUploadQuery() {
    await this.clear()
  }

  async onQueryFile(queryInfo: QueryInfo, uploadInfo: UploadInfo): Promise<QueryInfo|undefined> {
    const filePath = queryInfo.src;
    if (this.isNotHashFile(filePath)) {
      // hash compare.对比文件hash，只上传hash值不同的文件。
      const isEqual = await this.compare(filePath, uploadInfo);
      if (!isEqual) {
        return queryInfo
      } else {
        log(logMsg('skip: ' + logMsg(filePath, 'PATH')))
      }
    }
  }

  // 从服务器加载并载入hash文件。
  include(sftp: SFTPWrapper, localPath: string, remotePath: string) {
    const fileInfo:HashFileInfo = {
      filePath: path.join(localPath, hashCfg.file),
      serverPath: serverPathJoin(remotePath, hashCfg.file),
      assets: null,
      saved: false
    }
    this.fileInfos[localPath] = fileInfo;
    // 1.load server hash file
    return sfcall(sftp.fastGet, sftp, true, fileInfo.serverPath, fileInfo.filePath).then((fileExist) => {
      // 2.include it if file exists.
      if (fileExist) {
        log(logMsg('server hash file loaded.', 'STEP'));
        // 转换成绝对路径，require，不然，相对路径会导致报错。
        let absoluteHashFilePath = path.resolve(fileInfo.filePath);
        try {
          fileInfo.assets = require(absoluteHashFilePath) || {};
          log(logMsg('include hash file.', 'STEP'));
        } catch (err) {
          Promise.reject(new Error('require hash file error.'))
        }
        return Promise.resolve();
      } else {
        log(logMsg("server hash file isn't exists.", 'STEP'));
        return Promise.resolve();
      }
    });
  }

  // 保存hash文件
  save(uinfo) {
    const fileInfo = this.fileInfos[uinfo.source];
    if (fileInfo && fileInfo.assets) {
      return fswriteFile(fileInfo.filePath, JSON.stringify(fileInfo.assets)).then(() => {
        fileInfo.saved = true;
        log(logMsg(`save hash file(${fileInfo.filePath}).`, 'STEP'));
        return Promise.resolve(true);
      });
    } else {
      return Promise.resolve(false);
    }
  }

  // 清除hash文件
  clear() {
    log(logMsg('remove hash files.', 'STEP'));
    const all = Object.values(this.fileInfos).map(info => {
      if (info.saved && info.filePath) {
        return fsunlink(info.filePath);
      } else {
        return Promise.resolve();
      }
    })
    return Promise.all(all)
  }
  // 比较文件hash值
  compare(file, uinfo) {
    const fileInfo = this.fileInfos[uinfo.source];
    return fsreadFile(file).then((contents) => {
      // Initialize results object
      let hashValue = '';

      let absoluteFilePath = path.resolve(file);

      // If file was already hashed, get old hash
      if (fileInfo.assets && fileInfo.assets[absoluteFilePath]) {
        hashValue = fileInfo.assets[absoluteFilePath];
      }
      // Generate hash from content
      let newHashValue = this.generateHash(contents);

      // If hash was generated
      if (hashValue !== newHashValue) {
        hashValue = newHashValue;
        if (!fileInfo.assets) {
          fileInfo.assets = {};
        };

        // Add file to or update asset library
        fileInfo.assets[absoluteFilePath] = hashValue;
        return Promise.resolve(false);
      }
      return Promise.resolve(true);
    })
  }
  // 生成hash值
  generateHash(contents) {
    if (contents) {
      return hashCfg.hashKey + crypto.createHash(hashCfg.hasher).update(contents).digest('hex').slice(0, hashCfg.length);
    }

    return '';
  }

  isNotHashFile(file) {
    return path.basename(file) !== hashCfg.file;
  }

}