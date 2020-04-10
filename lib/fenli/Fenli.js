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

let fs = require('fs');
let path = require('path');
let colors = require('ansi-colors');
let util = require('util');
let Handler = require('../Handler');
let DirUtil = require('../core/DirUtil.js');
let FileModifier 	= require('../core/FileModifier');
let fetch = require('node-fetch');
let log = require('fancy-log');
let {isRelativePath, getConfigURL} = require('../utils/');
let _ = require('lodash');

const fslstat = util.promisify(fs.lstat);
const fsmkdir = util.promisify(fs.mkdir);
const fscopyFile = util.promisify(fs.copyFile);

const PROJECT_SUFFIX = '分离后';

const LOG_NAME = "Fenli: ";
const CONFIG_FILENAME = "fenli_addr.json";

// TODO: 是直接通过正则替换？还是通过postcss解析css，替换url?
// 正则的优势是： html,src地址和css的url地址，都可以替换。
// postcss的优势是： 可靠性比较高。
// 以images和ossweb-img目录为基础进行分离。

const IMG_REG = /(['"])(\.+\/)?(images|ossweb-img)/g;
const URL_REG = /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g;

const CSS_HTTP_REG = /(xmlns(:xlink)?\=['"])?http(s)?\:/g;
// 正则反向断言，不支持，ES2019可能支持。https://mp.weixin.qq.com/s/yjM8zWY0WjI9iYjskRXo2Q#%23
// (?!shareImgUrl:)
const HTML_HTTP_REG = /(shareImgUrl\:['"])?http(s)?\:/g;

// 上述方式不严谨，应当只去掉html标签和css样式内http(s):，script标签内的脚本统一不处理。
// html标签，即处理src、href属性？
// src属性(https://www.w3schools.com/tags/att_href.asp) img,audio,video,script,iframe,source...
// href属性(https://www.w3schools.com/tags/att_href.asp) a,link,area,base
// css样式，即处理url()结构？
const HTML_ELEMENT_HTTP_REG = /((src|href)\s*\=\s*['"])http(s)?\:/g
const CSS_URL_HTTP_REG = /(url\(\s*['"]?)http(s)?\:/g;
const HTML_IMG_REG = /((src|href)\s*\=\s*['"])(\.+\/)*(images|ossweb-img)/g

class Fenli  extends Handler{

	constructor(source, aliases, url) {
		super();
		
		this.source = source;
		if (!this.source) {
			return;
		}
		this.dest = this.source + PROJECT_SUFFIX;
		this.projectName = path.basename(this.source);
		this.getFenliPath(aliases, url).then((fenliPath)=>{
			// console.log(fenliPath);
			this.fenliPath = fenliPath;
			log(LOG_NAME, 'use ' + colors.cyan(this.fenliPath));
			return this.run(source);
		}).then(()=>{
			log(LOG_NAME, colors.green('fenli complete.'));
		}).catch((err)=>{
			log(LOG_NAME, colors.red(err));
		});
	}

	run(source) {
		return DirUtil.walkFile(source, ({filePath, type}) => {
			let _extName = path.extname(filePath);
			let _d = path.join(this.dest, path.relative(this.source, filePath));
			// console.log(_d);
			if (type == 'file') {
				if (['.html', '.htm', '.shtml', '.inc'].indexOf(_extName) >= 0) {
					log(LOG_NAME, 'fenli ' + _d);
					return FileModifier.modify(filePath, _d, (res)=>{
						res = this.replaceStyleURLPath(res, filePath);
						res = this.replaceHTMLElementURLPath(res, this.fenliPath + this.projectName);
						res = this.deleteProtocolInStyleURLs(res);
						res = this.deleteProtocolInHTMLElements(res);
						return res;
					})
				} else if (['.css'].indexOf(_extName) >= 0) {
					log(LOG_NAME, 'fenli ' + _d);
					return FileModifier.modify(filePath, _d, (res)=>{
						res = this.replaceStyleURLPath(res, filePath);
						res = this.deleteProtocolInStyleURLs(res);
						return res;
					});
				} else {
					return this.singleCopy(filePath, _d);
				}
			} else {
				return this.singleCopy(filePath, _d);
			}
		});
	}
	/**
	 * 删除样式url()结构中的协议——http(s):
	 */
	deleteProtocolInStyleURLs(res) {
		res = res.replace(CSS_URL_HTTP_REG, (match) => {
			return match ? match.replace(/http(s)?\:/, '') : match;
		})
		return res;
	}
	/**
	 * 删除HTML标签中的协议
	 * 主要是HTML标签的src、href属性
	 * src Attribute - img,audio,video,script,iframe,source...
	 * href Attribute - a,link,area,base
	 */
	deleteProtocolInHTMLElements(res) {
		res = res.replace(HTML_ELEMENT_HTTP_REG, (match) => {			
			return match ? match.replace(/http(s)?\:/, '') : match
		})
		return res;
	}

	/**
	 * 替换HTML标签内的相对路径地址（包含ossweb-img|images）
	 * @param {*} res 
	 * @param {*} path 
	 */
	replaceHTMLElementURLPath(res, path) {
		res = res.replace(HTML_IMG_REG, (match) => {
			console.log(match);
			return match ? match.replace(/(\.+\/)*(images|ossweb-img)/, path) : match;
		});
		return res;
	}
	/**
	 * 替换css样式中url()的地址
	 * @param  {[type]} res      [description]
	 * @param  {[type]} filePath 文件路径
	 * @return {[type]}          [description]
	 */
	replaceStyleURLPath(res, filePath) {
		// 1. 获取url内的地址
		// 2. 判断地址是否有效（要在图片文件夹内）。
		// 3. 替换地址
		res = res.replace(URL_REG, (match, p1, p2, p3, offset) => {
			if (isRelativePath(p2)) {
				// console.log(match, p1, p2, p3, offset);
				// console.log(p1, p2, p3);
				let rpath = p2;
				if (_.isString(p2)) {
					let lpath = path.join(path.dirname(filePath), p2);
					// windows是以\为分隔的，转换/分隔来处理。
					let llpath = lpath.split(path.sep).join('/');

					let reg = /^(.+\/)*(images|ossweb-img)/;
					if (llpath.match(reg)) {
						rpath = llpath.replace(reg, this.fenliPath+this.projectName);	
					}	
				}
				
				return p1 + rpath + p3;
			} else {
				return match;
			}
		})
		return res;
	}

	/**
	 * 复制文件。 如果目标地址是文件夹，而且已存在，则不复制。否则，创建文件夹。
	 * @param  {[type]} src  [description]
	 * @param  {[type]} dest [description]
	 * @return {[type]}      [description]
	 */
	singleCopy(src, dest) {
		return fslstat(src).then((ss)=>{
			if (ss.isDirectory()) {
				return fslstat(dest).then((stats)=>{
					if (stats.isDirectory()) {
						return Promise.resolve();
					} else {
						log(LOG_NAME, 'create dir ' + dest);
						return fsmkdir(dest, 0o777);
					}
				}).catch((err)=>{
					log(LOG_NAME, 'create dir ' + dest);
					return fsmkdir(dest, 0o777);
				})
			} else {
				// log(LOG_NAME, 'copy file ' + dest);
				return fscopyFile(src, dest);
			}
		}).catch((err)=>{
			console.log(err);
		});
	}

	/**
	 * 获取分离路径
	 */
	getFenliPath(aliases, url) {
		if (aliases) {
			return this.loadFenliData().then((data)=>{
				let _u = _.find(data, (o)=>o.product.indexOf(aliases.toLowerCase())>=0);
				if (_u) { return Promise.resolve(_u.url); }
				else { return Promise.reject(new Error("未找到别名("+aliases+")的分离地址")); }
			});
		} else if (url) {
			return Promise.resolve(url);
		} else {
			return Promise.reject(new Error("未指定分离地址"));
		}
	}

	/**
	 * 加载分离数据
	 */
	loadFenliData() {
		log(LOG_NAME, colors.yellow('load fenli data.'));
		return new Promise((resolve, reject)=>{
			try {
				// fetch(getConfigURL(CONFIG_FILENAME))
				fetch("https://api.egooidea.com/fenli/list")
				.then((res) => res.json())
				.then((data) => {
					if (data && data['ret'] == 0) {
						resolve(data.data);
					}else {
						log(LOG_NAME, colors.red('load fenli data error.'));
						reject(new Error("can't load fenli data."));
					}
				}).catch((err)=>{
					reject(err);
				});
			} catch(err) {
				reject(err);
			}
		})
	}
}

module.exports = Fenli;