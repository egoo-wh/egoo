/**
 * 打补丁——文件修改操作
 * 类似于中间件模式（Middleware Pattern）
 * 每个补丁专注于一次修改。
 * 
 * 如：
 * 去除协议补丁(DeleteProtocolPatch)
 * 分离补丁(FenliPatch)
 * HTML敏感代码注释补丁(HTMLCommenterPatch)
 * ServerSideInclude补丁(SSIPatch)
 */
import * as path from 'path';
import FileUtil from "../utils/FileUtil";
import * as colors from 'ansi-colors';
import * as util from 'util';
import * as fs from 'fs'
import { logger } from '../utils';

const log = logger('PatchInstaller')
const fsunlink = util.promisify(fs.unlink);
/**
 * 补丁安装器
 */
export class PatchInstaller {
  private patchs: Patch[];
  private mergedInfos: PatchInfo[];
  constructor() {
  }
  register(patch: Patch) {
    if (!this.patchs) {
      this.patchs = []
    }
    if (this.patchs) {
      const found = this.patchs.some(p => p.name === patch.name)
      if (found) {
        return
      }
    }
    this.patchs.push(patch);
  }
  registers(patchs: Patch[]) {
    patchs.forEach(p => {
      this.register(p);
    })
  }

  detect(file) {
    return this.patchs.filter(patch => patch.detect(file));
  }

  detectAndAdd(file, dest: string | null = null) {
    const patches = this.detect(file);
    if (patches && patches.length > 0) {
      const tempsPath = patches.map(patch => patch.add(file, dest));
      return tempsPath;
    }
  }

  async run() {
    if (!this.patchs) {
      return null;
    }
    // 执行所有补丁prepare
    await Promise.all(this.patchs.map(patch => patch.prepare()))
    const mergedInfos = this.merge();
    this.mergedInfos = mergedInfos;
    return mergedInfos.reduce(async (promise, info) => {
      try {
        await promise;
        // 返回所有Patch的transform操作
        const streams = info.patch.map(patchName => {
          const patch = this.getPatch(patchName);
          if (patch) {
            // log(colors.yellow(`${patch.name} run`));
            return patch.run(info);
          } else {
            return null
          }
        })
        // log(colors.yellow(`${info.src} run`));
        // 全部丢给管道操作
        return await FileUtil.modify(info.src, info.dest, streams);
      } catch (error) {
        return Promise.reject(error);
      }
    }, Promise.resolve())
  }

  /**
   * 合并patchs的所有PatchInfo，PatchInfo相等(src和dest相同)则合并。
   */
  merge() {
    return this.patchs.reduce((arr: PatchInfo[], patch: Patch) => {
      if (patch.infos) {
        patch.infos.forEach((info: PatchInfo) => {
          let foundInfo = arr.find(a => a.equal(info));
          if (foundInfo) {
            foundInfo.merge(info);
          } else {
            arr.push(info.clone());
          }
        })
      }
      return arr;
    }, [])
  }

  getPatch(name: string) {
    return this.patchs.find(p => p.name === name);
  }

  /**
   * 清除临时文件
   */
  async clear() {
    if (this.mergedInfos && this.mergedInfos.length > 0) {
      const all = this.mergedInfos.map(async info => {
        return await fsunlink(info.dest);
      })
      return Promise.all(all);
    }
  }
}

/**
 * 补丁基类
 * 所有补丁都需要继承
 */
export abstract class Patch {
  public name: string;
  // 补丁文件存放临时组
  public infos: PatchInfo[];

  constructor(name: string) {
    this.name = name;
  }

  /**
   * 检测文件是否需要打补丁。是则加入补丁临时组
   * @param file 
   */
  abstract detect(file: string): boolean;

  /**
   * 加入补丁临时组
   * @param file 
   * @param dest 目标路径，如果不指定，则为临时文件(~fileName)，返回目标路径
   * @return 临时文件地址 ~fileName
   */
  add(file: string, dest: string | null = null): string {
    if (!this.infos) { this.infos = []; }
    if (dest) {
      this.infos.push(new PatchInfo(file, dest, [this.name]))
      return dest;
    } else {
      let fileName = path.basename(file);
      if (fileName.substr(0, 1) !== '~') {
        let tempPath = path.join(file, '..', '~' + fileName);
        this.infos.push(new PatchInfo(file, tempPath, [this.name]))
        return tempPath;
      } else {
        // return '';
        throw new Error("文件不能以~开头，请修改");
      }
    }
  }

  /**
   * 执行打补丁之前的准备工作。
   * 通常用来获取执行补丁时所需的额外数据。
   */
  abstract async prepare(): Promise<any>;
  /**
   * 执行打补丁（文件修改），返回一个Transform（throught2对象）
   * @return throught2 | Transform
   */
  abstract run(info: PatchInfo): any;

  toString(): string {
    return this.name;
  }
}

/**
 * 补丁文件信息
 */
export class PatchInfo {
  public src: string;
  public dest: string;
  public patch: string[];

  constructor(src: string, dest: string, patch: string[]) {
    this.src = src;
    this.dest = dest;
    this.patch = patch;
  }

  equal(info) {
    return info.src == this.src && info.dest == this.dest;
  }

  merge(info: PatchInfo) {
    this.patch = this.patch.concat(info.patch);
  }
  clone() {
    return new PatchInfo(this.src, this.dest, this.patch)
  }
}