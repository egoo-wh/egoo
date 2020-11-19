'use strict';

import * as prompt from 'prompt';
import * as colors from 'ansi-colors';
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
import * as log from 'fancy-log';
import { isPromise, isUnixHiddenPath } from './index';

const fslstat = util.promisify(fs.lstat);
const fsmkdir = util.promisify(fs.mkdir);
const fscopyFile = util.promisify(fs.copyFile);
const fsreaddir = util.promisify(fs.readdir);


export interface WalkFileHandler {
  filePath: string,
  type: 'file'|'dir'
}

/**
 * [description]
 * @param  {[type]} src     [description]
 * @param  {[type]} handler ({filePath, type}): Promise
 * @return {[type]}         [description]
 */
export async function walkFile<T extends WalkFileHandler>(src: string, handler: (param: T) => Promise<any>) {
  if (!handler) {
    throw new Error('no handler function');
  }
  let stats;
  try {
    stats = await fslstat(src);
  } catch (error) {
    throw new Error('src is invalid')
  }
  if (!stats) { return }
  if (stats.isDirectory()) {
    handler && handler.call(null, { filePath: src, type: "dir" } as T);
    const files = await fsreaddir(src);
    let all = files.map((file) => {
      if (!isUnixHiddenPath(file)) {
        return walkFile(path.join(src, file), handler);
      }
    });
    return Promise.all(all);
    // return files.reduce(async (promise, file) => {
    //   await promise
    //   if (!isUnixHiddenPath(file)) {
    //     return walkFile(path.join(src, file), handler);
    //   }
    // }, Promise.resolve())
  } else {
    let handlerReturn = handler && handler.call(null, { filePath: src, type: "file" } as T);
    return isPromise(handlerReturn) ? handlerReturn : Promise.resolve(handlerReturn);
  }
}
/**
 * “Promise化”sftp的方法调用
 * @param  {Function} fn                  [description]
 * @param  {[type]}   ctx                 [description]
 * @param  {Boolean}  isErrorResolveFalse [description]
 * @param  {[type]}   args                [description]
 * @return {[type]}                       [description]
 */
export function sfcall(fn, ctx, isErrorResolveFalse, ...fnArgs) {
  if (!fn) {
    throw new Error("can't find function for sfcall.");
  };
  return new Promise((resolve, reject) => {
    function fnCallback(err) {
      if (isErrorResolveFalse) {
        if (err) { resolve(false); }
        else { resolve(true); }
      } else {
        if (err) { reject(err); }
        else { resolve(); }
      }
    }
    try {
      fn.apply(ctx, fnArgs.concat(fnCallback));
    } catch (err) {
      reject(err);
    }
  })
}

/**
 * 复制文件。 如果目标地址是文件夹，而且已存在，则不复制。否则，创建文件夹。
 * @param  {[type]} src  [description]
 * @param  {[type]} dest [description]
 * @return {[type]}      [description]
 */
export async function cp(src, dest) {
  if (!dest) {
    throw new Error('cp dest is empty');
  }
  let srcStats;
  try {
    srcStats = await fslstat(src);  
  } catch (error) {
    throw new Error('cp src is not exist')
  }
  if (srcStats.isDirectory()) {
    let destStats;
    try {
      destStats = await fslstat(dest);
    } catch (error) {
      return fsmkdir(dest, 0o777);
    }

    if (destStats.isDirectory()) {
      return Promise.resolve()
    } else {
      return fsmkdir(dest, 0o777);
    }
  } else {
    // log(LOG_NAME, 'copy file ' + dest);
    return fscopyFile(src, dest)
  }
}

/**
 * 显示命令行提示
 * @param  {[type]} props Array[String/{name,message}]
 * @return {[type]}       [description]
 */
export function showPrompt(props) {
  return new Promise((resolve, reject) => {
    let p = props.reduce((result, value) => {
      if (typeof value === 'string') {
        result[value] = { message: colors.yellow(value) + ":", required: true };
      } else if (typeof value === 'object' && 'name' in value) {
        result[value['name']] = { message: colors.yellow(value['message'] + ":"), required: true };
      }
      return result;
    }, {});

    prompt.message = colors.yellow('请输入')
    prompt.delimiter = '';

    prompt.start();

    prompt.get({ properties: p }, function (err, result) {
      if (err) { reject(err) }
      else {
        resolve(result);
      }
    });
  })
}