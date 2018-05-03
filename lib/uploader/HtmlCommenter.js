let fs 				= require('fs');
let path 			= require('path');
let _ = require('lodash');
let colors 		= require('ansi-colors');
let FileModifier 	= require('../core/FileModifier');
let IllegalCodeMgr = require('./IllegalCodeMgr');
let log = require('fancy-log');
let util = require('util');
/**
 * HTML文件注释类
 * 将一些敏感代码进行注释。敏感代码为可能引发腾讯电脑管家等软件报恶意网站的代码（如QQ登录、统计代码等相关JS）。
 * 步骤：
 * 1.定义需要过滤的文件类型
 * 2.被修改文件（如index.html），将被修改成~index.html文件。
 * 3.将修改后的~index.html上传到服务器上对应位置的index.html
 * 4.上传结束，清除本地的~index.html文件
 *
 * 额外步骤：
 * 替换shtml的include。（因为git pages不支持shtml include，所以在上传阶段替换include模块）
 *
 * 敏感代码文件由IllegalCodeMgr.js管理
 */

const fsunlink = util.promisify(fs.unlink);
const fslstat = util.promisify(fs.lstat);
const fsreadFile = util.promisify(fs.readFile);

const needFilterFileExts = ['.html', '.shtml', '.htm'];
const INCLUDE_REG = /(<!--\s*#include\s*(virtual|file)\=[\"\'])(.*)[\"\']\s*-->/g;

const LOG_NAME = 'HtmlCommenter';

class HtmlCommenter {

	constructor(shtmlReplaced) {
		this.shtmlReplaced = shtmlReplaced;
		this.filterTemps = null;
		this.includeFileContents = null;
		this.includeContents = null;
	}

	add(file) {
		if (!this.filterTemps) { this.filterTemps = []; }
		let fileName = path.basename(file);
		if (fileName.substr(0, 1) !== '~') {
			let tempPath = path.join(file, '..', '~'+fileName);
			this.filterTemps.push({"src": file, "dest": tempPath});
			return tempPath;
		} else {
			return null;
		}
	}

	run() {
		if (this.filterTemps && this.filterTemps.length > 0) {
			return this.getIncludeFileContents().then(()=>{
				return this.comment();
			})
		} else {
			return Promise.resolve();
		}
	}

	/**
	 * 替换server side include
	 * @return {[type]} [description]
	 */
	replaceSSI(res) {
		log(LOG_NAME, colors.yellow('server side include.'));
		res = res.replace(INCLUDE_REG, (match, p1, p2, p3, offset)=>{
			// console.log(p3);
			let includeFile = p3;
			if (includeFile && this.includeContents) {
				// console.log(this.includeContents[includeFile]);
				// log(LOG_NAME, colors.yellow('server side include.'));
				return this.includeContents[includeFile];
			}
			return match;
		})
		return res;
	}

	/**
	 * 获取shtml文件中include的文件内容，以便后面替换
	 * @return {[type]} [description]
	 */
	getIncludeFileContents() {
		if (this.shtmlReplaced) {
			log(LOG_NAME, colors.yellow('get include contents'));
			let all = _.chain(this.filterTemps)
			.filter((temp)=>{
				return path.extname(temp["src"]) === ".shtml";
			})
			.map((temp)=>{
				// console.log(temp);
				return new Promise((resolve, reject)=>{
					FileModifier.read(temp["src"], (contents)=>{

						let match;
						let _includes = [];
						while((match = INCLUDE_REG.exec(contents)) !== null) {
							let includeFile = match && match[3];
							// console.log(includeFile);
							if (includeFile) {
								let includeFilePath = path.join(path.dirname(temp["src"]), includeFile);
								if (includeFilePath) {
									// console.log(includeFilePath);
									// 获取include文件内容
									let p = fslstat(includeFilePath).then((stat)=>{
										return FileModifier.read(includeFilePath, (includeContents)=>{
											if (!this.includeContents) { this.includeContents = {}; }
											this.includeContents[includeFile] = includeContents;
											log(LOG_NAME, colors.yellow('get include content '+includeFile));
										});
									}).catch((err)=>{
										reject(err);
									});
									_includes.push(p);
								} else {
									reject(new Error("include file can't found."));
								}
							}
						}
						Promise.all(_includes).then(()=>{
							resolve();
						});
					})
				})
			})
			.value();
			return Promise.all(all);	
		} else {
			return Promise.resolve();
		}
	}

	comment() {
		let icm = new IllegalCodeMgr();
		return icm.getRules().then((rules)=>{
			log(LOG_NAME, colors.yellow('filter html illegal code.'));
			let all = _.chain(this.filterTemps)
			.map((temp) => {
				return FileModifier.modify(temp["src"], temp["dest"], (res)=>{
					if (this.shtmlReplaced && path.extname(temp["src"]) === ".shtml") {
						res = this.replaceSSI(res);
					}

					if (rules) {
            try {
              _.forEach(rules, function(pair){
                  let pattern = pair['pattern'];
                  let regexp = new RegExp(pattern, 'g');
                  // don't use regex.test(res).
                  // @see http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
                  // console.log(res);

                  if (pattern && res.match(regexp)) {
                      res = res.replace(regexp, pair['replacement']);
                  }
              });
               
            }catch(err){
                console.log(err);
            }
	        }
					return res;
				});
			})
			.value();

			return Promise.all(all);
		});
	}

	isNeedFilter(file) {
		return needFilterFileExts.indexOf(path.extname(file)) >= 0;
	}

	clear() {
		log(LOG_NAME, colors.yellow('remove temp files for filter.'));
		if (this.filterTemps && this.filterTemps.length > 0) {
			let all = _.chain(this.filterTemps)
				.map((temp) => {
					return fsunlink(temp["dest"]);
				})
				.value();

			return Promise.all(all);
		} else {
			return Promise.resolve();
		}
	}
}

module.exports = HtmlCommenter;