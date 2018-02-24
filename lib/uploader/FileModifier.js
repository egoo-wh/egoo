"use strict"

let fs              = require('fs');
let iconv           = require('iconv-lite');
let jschardet       = require("jschardet");
let Transform       = require("stream").Transform;
let _               = require('lodash');

let FileModifier = module.exports = {};

// == Exports ==================================================================
/**
 * [modify description]
 * @param  {[type]} filePath    [description]
 * @param  {[type]} outputPath  [description]
 * @param  {[type]} replacePairs [{reg:,replacement}]
 * @return {[type]}             Promise
 */
FileModifier.modify = function(filePath, outputPath, replacePairs) {
    // 先检测文件编码，然后进行 文本的 替换操作。替换操作需先进行编码转换。
    return FileModifier.detectFileEncoding(filePath).then(function(enc){
        // console.log("detech file encoding "+enc);
        return replaceOnStream(filePath, outputPath, enc, replacePairs);
    });
}

function replaceOnStream(filePath, outputPath, encoding, replacePairs) {
    return new Promise(function(resolve, reject) {
        let readStream = fs.createReadStream(filePath);
        let writeStream = fs.createWriteStream(outputPath);

        function onStreamError(err) {
            console.log(err);
            reject(err);
        };

        readStream.on('error', onStreamError);
        writeStream.on('error', onStreamError);
        writeStream.on('open', function(){
            readStream
                .pipe(replacedDecodeStream(encoding, replacePairs))
                // .pipe(iconv.encodeStream(encoding))
                .pipe(writeStream);
        });
        writeStream.on('finish', function() {
            // console.log('finish');
            resolve();
        });
    });
}

function replacedDecodeStream(encoding, replacePairs, options) {
    return new IconvLiteDecoderStream(iconv.getDecoder(encoding, options), replacePairs, options);
};

// == file encoding detecter ======================
FileModifier.encodingCache = {};
/**
 * [detectFileEncoding description]
 * @param  {[type]} filepath [description]
 * @return {[type]}          Promise
 */
FileModifier.detectFileEncoding = function (filepath) {
    return new Promise(function(resolve, reject) {
        let encoding = null;
        if (FileModifier.encodingCache && filepath && FileModifier.encodingCache[filepath]) {
            // 缓存中获取
            encoding = FileModifier.encodingCache[filepath];
            resolve(encoding);
        }else {
            let fileEncoding, metaEncoding;
            // 检测编码
            let readStream = fs.createReadStream(filepath);

            function onStreamError(err) {
                reject();
            };

            readStream.on('error', onStreamError);
            readStream.on('data', function(chunk) {
                let fileDetect = jschardet.detect(chunk);
                fileEncoding = fileDetect.encoding;
                FileModifier.encodingCache[filepath] = fileEncoding;
                
                // HACK: not in api docs.
                readStream.close();
            });
            readStream.on('close', function(chunk) {
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

FileModifier.detectFileEncodingByBuffer = function(file) {
    if (file.isNull()) { return null; }
    if (file.isStream()) { return null;}
    let filepath = file.path;
    if (FileModifier.encodingCache && filepath && FileModifier.encodingCache[filepath]) {
        // 缓存中获取
        encoding = FileModifier.encodingCache[filepath];
        return (encoding);
    }else {
        let fileDetect = jschardet.detect(chunk);
        fileEncoding = fileDetect.encoding;
        FileModifier.encodingCache[filepath] = fileEncoding;
        return (fileEncoding);
    }
}


FileModifier.equal = function(encoding1, encoding2) {
    let e1 = encoding1.toUpperCase();
    let e2 = encoding2.toUpperCase();
    if (e1 == e2) { return true;};
    let pairs = [["UTF8", "UTF-8"], ["GBK", "GB2312"]];
    for (let i = 0; i < pairs.length; i++) {
        let _idx = pairs[i].indexOf(e1);        
        if (_idx >= 0) {
            if (pairs[i][(_idx+1)%2] == e2) {
                return true;
            }else {
                return false;
            }
        };
    };
    return true;
}
// 在Transform的_transform函数中检测编码之后，新建iconv实例，会造成乱码。必须在进入stream之前，实例化iconv.
// == Decoder stream =======================================================
function IconvLiteDecoderStream(conv, replacePairs, options) {
    this.conv = conv;
    this.replacePairs = replacePairs;
    options = options || {};
    options.encoding = this.encoding = 'utf8'; // We output strings.
    Transform.call(this, options);
}
// function IconvLiteDecoderStream(filepath, replacePairs, options) {
//     // this.conv = iconv.getDecoder("GB2312", options);
//     this.filepath = filepath;
//     this.replacePairs = replacePairs;
//     this.opt = options;
//     options = options || {};
//     options.encoding = this.encoding = 'utf8'; // We output strings.
//     Transform.call(this, options);
// }


IconvLiteDecoderStream.prototype = Object.create(Transform.prototype, {
    constructor: { value: IconvLiteDecoderStream }
});

IconvLiteDecoderStream.prototype._transform = function(chunk, encoding, done) {
    if (!Buffer.isBuffer(chunk))
        return done(new Error("Iconv decoding stream needs buffers as its input."));
    try {
        // let self = this;
        // FileModifier.detect(this.filepath, chunk).then(function(fileEncoding){
        //     console.log('encoding:', self.filepath, fileEncoding);
        //     console.log(this);
        //     self.conv = iconv.getDecoder(fileEncoding, self.opt);
        //     let res = self.conv.write(chunk);
        //     // if (res && res.length) this.push(res, this.encoding);
        //     if (res && res.length) {
        //         if (self.replacePairs) {
        //             for (let i = 0; i < self.replacePairs.length; i++) {
        //                 if (res.match(self.replacePairs[i]['pattern'])) {
        //                     res = res.replace(self.replacePairs[i]['pattern'], self.replacePairs[i]['replacement']);
        //                 }
        //             };
        //         }
        //         self.push(res, self.encoding);
        //     }
        //     done();
        // }).catch(function(err){
        //     console.log(err);
        // });
        

        let res = this.conv.write(chunk);
        if (res && res.length) {
            // TODO：测试敏感代码正则，错误的正则会导致这里死循环？
            if (this.replacePairs) {
                try {
                    _.forEach(this.replacePairs, function(pair){
                        let pattern = pair['pattern'];
                        let regexp = new RegExp(pattern, 'g');
                        // don't use regex.test(res).
                        // @see http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
                        // console.log(res);

                        if (pattern && res.match(regexp)) {
                            res = res.replace(regexp, pair['replacement']);
                        }
                        // console.log('-------');
                    });
                }catch(err){
                    console.log(err);
                }
                
                // console.log('aaa');
            }
            // console.log(res);
            this.push(res, this.encoding);
        }
        done();
        
    }
    catch (e) {
        done(e);
    }
}

IconvLiteDecoderStream.prototype._flush = function(done) {
    try {
        let res = this.conv.end();
        if (res && res.length) {
            if (this.replacePairs) {
                _.forEach(this.replacePairs, function(pair){
                    let pattern = pair['pattern'];
                    let regexp = new RegExp(pattern, 'g');
                    if (pattern && res.match(regexp)) {
                        res = res.replace(regexp, pair['replacement']);
                    }
                })
            }
            this.push(res, this.encoding);
        }
        done();
    }
    catch (e) {
        done(e);
    }
}

IconvLiteDecoderStream.prototype.collect = function(cb) {
    let res = '';
    this.on('error', cb);
    this.on('data', function(chunk) { res += chunk; });
    this.on('end', function() {
        cb(null, res);
    });
    return this;
}

