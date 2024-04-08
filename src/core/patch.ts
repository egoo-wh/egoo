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
import path from 'path';
import FileUtil from "../utils/FileUtil";
import { promises as fs} from 'fs'
import { logger } from '../utils';

const log = logger('PatchInstaller')
/**
 * 补丁安装器
 */
export class PatchInstaller {
  private patchs: Patch[] = [];
  private mergedInfos: PatchInfo[];
  // 补丁文件存放临时组
  public infos: PatchInfo[] = [];
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

  add(patchs: Patch[], file: string, dest: string | null = null): PatchInfo {
    if (this.infos.some(info => info.src.indexOf(file) >= 0)) {
      throw new Error("重复add，请检查");
    }
    let pi;
    if (dest) {
      pi = new PatchInfo(file, dest, [])
    } else {
      let fileName = path.basename(file);
      if (fileName.substring(0, 1) !== '~') {
        let tempPath = path.join(file, '..', '~' + fileName);
        pi = new PatchInfo(file, tempPath, [])
        pi.isTempFileDest = true;
      } else {
        // return '';
        throw new Error(`文件不能以~开头，请修改 ${file}`);
      }
    }
    pi.patchs = patchs;
    this.infos.push(pi)
    return pi;
  }
  /**
   * 检测并添加
   * @param file
   * @param dest 目标路径，如果不指定，则为临时文件(~fileName)
   */
  detectAndAdd(file: string, dest: string | null = null): PatchInfo | null {
    let patchs = this.detect(file);
    if (patchs && patchs.length > 0) {
      return this.add(patchs, file, dest);
    }
    return null
  }

  async run(info: PatchInfo) {
    // 返回所有Patch的替换操作
    const replacements = info.patchs.map(patch => {
      return patch.run(info);
    })
    // log(colors.yellow(`${info.src} run`));
    return await FileUtil.modify(info.src, info.dest, replacements);
  }

  async runAll() {
    const all = this.infos.map(info => {
      return this.run(info)
    })
    return Promise.resolve(all);
  }

  getPatch(name: string) {
    return this.patchs.find(p => p.name === name);
  }

  /**
   * 清除临时文件
   */
  async clear() {
    const all = this.infos.map(async info => {
      if (info.isTempFileDest) {
        return await fs.unlink(info.dest)
      } else {
        return Promise.resolve()
      }
    })
    return Promise.all(all);
  }
}

/**
 * 补丁基类
 * 所有补丁都需要继承
 */
export abstract class Patch {
  public name: string;

  constructor(name: string) {
    this.name = name;
  }

  /**
   * 检测文件是否需要打补丁。是则加入补丁临时组
   * @param file 
   */
  abstract detect(file: string): boolean;

  /**
   * 执行打补丁之前的准备工作。
   * 通常用来获取执行补丁时所需的额外数据。
   */
  abstract prepare(): Promise<any>;
  /**
   * 执行打补丁（文件修改），返回字符串替换函数，具体信息查看FileUtil.modify
   * @return (line: string) => string
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
  public patchs: Patch[];
  public isTempFileDest: boolean = false

  constructor(src: string, dest: string, patchs: Patch[]) {
    this.src = src;
    this.dest = dest;
    this.patchs = patchs;
  }

  equal(info) {
    return info.src == this.src && info.dest == this.dest;
  }

  merge(info: PatchInfo) {
    this.patchs = this.patchs.concat(info.patchs);
  }
  clone() {
    return new PatchInfo(this.src, this.dest, this.patchs)
  }
}