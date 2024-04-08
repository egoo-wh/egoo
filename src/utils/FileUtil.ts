"use strict"

import { type Stream } from 'stream';
import { promises as fs, createReadStream, createWriteStream } from 'fs';
import iconv from 'iconv-lite';
import SplitStream from '../core/SplitStream'
import pump from 'pump';
import pumpify from 'pumpify';
import jschardet from 'jschardet';

// == file encoding detecter ======================
let encodingCache: { [key: string]: string } = {};
/**
 * [detectFileEncoding description]
 * @param  {[type]} filepath [description]
 * @return {[type]}          Promise
 */
function detectFileEncode(filepath: string): Promise<string> {
  return new Promise(function (resolve, reject) {
    let encoding;
    if (encodingCache && filepath && encodingCache[filepath]) {
      // 缓存中获取
      encoding = encodingCache[filepath];
      resolve(encoding);
    } else {
      let fileEncoding: string, metaEncoding;
      // 检测编码
      let readStream = createReadStream(filepath, {
        emitClose: true
      });

      readStream.on('error', (err) => {
        reject(err)
      });
      readStream.on('data', function (chunk) {
        let fileDetect = jschardet.detect(chunk as Buffer);
        fileEncoding = fileDetect.encoding;
        encodingCache[filepath] = fileEncoding;

        // HACK: not in api docs.
        readStream.close();
      });
      readStream.on('close', function (chunk) {
        fileEncoding = fileEncoding || 'utf8';
        resolve(fileEncoding);
      })

      // 检查html meta charset编码信息
      // let buffer = iconv.decode(chunk, fileEncoding);
      // let matches = buffer.match(/meta\s+charset="[\w-]+"/g);
      // if (matches) {
      //     let ms = matches[0];
      //     let cs = 'charset="';
      //     let ii = ms.indexOf(cs);
      //     let li = ms.lastIndexOf('"');
      //     metaEncoding = ms.substring(ii+cs.length, li);
      //     if (metaEncoding) { metaEncoding = metaEncoding.toUpperCase(); }
      // }
    }
  });
}

function isFileEncodeEqual(encoding1: string, encoding2: string): boolean {
  let e1 = encoding1.toUpperCase();
  let e2 = encoding2.toUpperCase();
  if (e1 == e2) { return true; };
  let pairs = [["UTF8", "UTF-8"], ["GBK", "GB2312"]];
  for (let i = 0; i < pairs.length; i++) {
    let _idx = pairs[i].indexOf(e1);
    if (_idx >= 0) {
      if (pairs[i][(_idx + 1) % 2] == e2) {
        return true;
      } else {
        return false;
      }
    };
  };
  return true;
}

/**
 * 通过函数修改文件
 * @param inputPath 输入文件路径
 * @param outputPath 输出文件路径
 * @param replaces 修改文件的函数组
 */
async function modify(inputPath: string, outputPath: string, replaces: ((line: string) => string)[]): Promise<void> {
  replaces = replaces || [];
  // 先检测文件编码
  const encoding = await detectFileEncode(inputPath);
  if (!iconv.encodingExists(encoding)) {
    throw new Error('unsupport encoding ' + encoding);
  }
  // 进行 文本的 替换操作。
  return new Promise((resolve, reject) => {
    let source = createReadStream(inputPath, {
      highWaterMark: 1028 * 1028
    });
    let dest = createWriteStream(outputPath);
    // 每行数据的替换
    const split = SplitStream((line) => {
      const r = replaces.reduce((l, replaceFn) => {
        return replaceFn(l)
      }, line);
      return r
    })
    // 替换操作需先进行编码转换。
    let pipes = new pumpify(iconv.decodeStream(encoding), split, iconv.encodeStream(encoding));
    pump(source, pipes, dest, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  })
}

/**
 * 通过流式管道(pipe)修改文件
 * @param inputPath 输入文件路径
 * @param outputPath 输出文件路径
 * @param streams stream
 */
async function modifyByStreams(inputPath: string, outputPath: string, streams: Stream[]): Promise<void> {
  // 先检测文件编码
  const encoding = await detectFileEncode(inputPath);
  if (!iconv.encodingExists(encoding)) {
    throw new Error('unsupport encoding ' + encoding);
  }
  // 进行 文本的 替换操作。
  return new Promise((resolve, reject) => {
    let source = createReadStream(inputPath, {
      highWaterMark: 1028 * 1028
    });
    let dest = createWriteStream(outputPath);
    // 替换操作需先进行编码转换。
    
    // 流中的数据(chunk)是否会正好在要替换的内容中间截断？ 
    // @see https://stackoverflow.com/questions/50944211/will-chunks-in-transform-streams-break-replace-attempts
    // 下面这2个库。都实现了对边界的友好处理（replacement friendy with chunk boundary）。
    // @see https://github.com/eugeneware/replacestream
    // @see https://github.com/ChocolateLoverRaj/stream-replace-string#readme
    // 但是，为了更加简单直观，逻辑修改为 读取文本每行，然后替换。详见modify方法
    let pipes = new pumpify(iconv.decodeStream(encoding), ...streams, iconv.encodeStream(encoding));
    pump(source, pipes, dest, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    })
  }) 
}

async function createFolder(path: string) {
  let stats;
  try {
    stats = await fs.lstat(path);
  } catch (error) {
    // console.log(error)
    return fs.mkdir(path, 0o777);
  }
  if (stats.isDirectory()) {
    return true
  } else {
    return fs.mkdir(path, 0o777);
  }
}

export default {
  detectFileEncode,
  isFileEncodeEqual,
  modify,
  modifyByStreams,
  createFolder
}
