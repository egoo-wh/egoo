import * as path from 'path';
import * as colors from 'ansi-colors';
import * as fancylog from 'fancy-log';

// 配置文件基准地址
const CONFIG_URL = 'http://cli.egooidea.com/';
// const CONFIG_URL = 'https://raw.githubusercontent.com/egoo-wh/egoo/master/conf/';
// const CONFIG_URL = 'http://192.168.1.11/static/';

/**
 * 打印
 * colors 使用规范
    表示文件路径 -> cyan
    表示命令行错误/提示 -> red
    表示关键步骤 -> blue
    表示一般提示 -> yellow
    表示成功完成 -> green
 * @param name 打印信息的模块名/标签名
 */
export function logMsg(msg: string | any, type: 'PATH' | 'ERROR' | 'STEP' | 'TIP' | 'SUCCESS' | 'UNDERLINE' | '' = '') {
  let fn: colors.StyleFunction;
  switch (type) {
    case 'PATH': fn = colors.cyan; break;
    case 'ERROR': fn = colors.red; break;
    case 'STEP': fn = colors.yellow; break;
    case 'TIP': fn = colors.magenta; break;
    case 'SUCCESS': fn = colors.green; break;
    case 'UNDERLINE': fn = colors.underline; break;
    default: fn = colors.white; break;
  }
  return fn(msg);
}
export function logger(name: string) {
  return (...args) => {
    fancylog.info(`${name}: `,  ...args)
  }
}

let appRoot;
export function setAppRoot(path) {
  appRoot = path;
}
export function appRootPathJoin(...paths): string {
  if (!appRoot) {
    throw new Error('use setAppRoot before');
  }
  return path.join(appRoot, ...paths);
}

/**
 * 用于服务器端连接路径。linux服务器用/连接
 * @param  {...[type]} paths [description]
 * @return {[type]}          [description]
 */
export function serverPathJoin(...paths): string {
  return paths.reduce((v, p) => {
    let s = '';
    if (typeof p === 'string') {
      s = p;
    } else if (Array.isArray(p)) {
      // s = p.join(path.sep);
      s = p.join('/');
    } else {
      s = p.toString();
    }
    return v ? v + '/' + s : s;
  }, '');
  // return paths.join('/');
}

/**
 * 单位转换
 * @param  {[type]} num [description]
 * @return {[type]}     [description]
 */
export function bytesSizeFormat(num: number):string {
  let KB = 1000;
  let MB = Math.pow(KB, 2);
  let GB = Math.pow(KB, 3);
  if (num < KB) {
    return num + '字节';
  } else if (KB <= num && num < MB) {
    return Math.floor(num / KB) + "KB";
  } else if (MB <= num && num < GB) {
    return Math.floor(num / MB) + "MB";
  } else {
    return Math.floor(num / GB) + "GB";
  }
}

export function getConfigURL(configFileName) {
  return CONFIG_URL + configFileName;
}
export function getLocalURL(configFileName) {
  return appRootPathJoin('data', configFileName);
}


export function isRelativePath(p: string): boolean {
  return !/^((http(s)?|ftp|):)?\/\//i.test(p) && !/^(data:image)/i.test(p) && !/^(data:application)/i.test(p) && !path.isAbsolute(p);
}

export function isHttpPath(p: string): boolean {
  return /^(http(s)?:)?\/\//i.test(p);
}

// https://github.com/then/is-promise
export function isPromise(obj) {
  return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}
/**
 * Checks whether a path starts with or contains a hidden file or a folder.
 * @param {string} source - The path of the file that needs to be validated.
 * returns {boolean} - `true` if the source is blacklisted and otherwise `false`.
 */
export function isUnixHiddenPath(path) {
  return (/(^|\/)\.[^\/\.]/g).test(path);
};


export function convertToFileExt(extKey) {
  switch (extKey) {
    case 'html':
      return ['.shtml', '.html', 'htm']
      break;
    default:
      return [];
      break;
  }
}