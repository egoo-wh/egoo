/**
 * 分离工具。做下列几件事情：
 * 	- 复制并重命名（项目名后面加“分离后”）整个包	
	- 图片分离，只分离html文件(.htm,.html,.shtml,.inc)和css文件
	- 去掉html文件中绝对路径前的http(s):
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
const HTTP_REG = /http(s)?\:/g;

class Fenli  extends Handler{

	constructor(source, aliases, url) {
		super();
		
		this.source = source;
		this.dest = this.source + PROJECT_SUFFIX;
		this.projectName = path.basename(this.source);
		this.getFenliPath(aliases, url).then((fenliPath)=>{
			// console.log(fenliPath);
			this.fenliPath = fenliPath;
			log(LOG_NAME, 'use ' + colors.green(this.fenliPath));
			return this.run(source);
		}).catch((err)=>{
			log(LOG_NAME, colors.red(err));
		});
	}

	run(source) {
		DirUtil.walkFile(source, ({filePath, type}) => {
			let _extName = path.extname(filePath);
			let _d = path.join(this.dest, path.relative(this.source, filePath));
			// console.log(_d);
			if (type == 'file') {
				if (['.html', '.htm', '.shtml', '.inc'].indexOf(_extName) >= 0) {
					log(LOG_NAME, 'fenli ' + _d);
					return FileModifier.modify(filePath, _d, (res)=>{
						res = this.replaceURL(res, filePath);
						res = res.replace(IMG_REG, "$1"+this.fenliPath+this.projectName);
						res = res.replace(HTTP_REG, "");
						return res;
					})
				} else if (['.css'].indexOf(_extName) >= 0) {
					log(LOG_NAME, 'fenli ' + _d);
					return FileModifier.modify(filePath, _d, (res)=>{
						res = this.replaceURL(res, filePath);
						res = res.replace(HTTP_REG, "");
						return res;
					});
				} else {
					return this.singleCopy(filePath, _d);
				}
			} else {
				return this.singleCopy(filePath, _d);
			}
		}).catch((err)=>{
			log(LOG_NAME, colors.red(err));
		});
	}
	/**
	 * 替换css中url()的图片地址
	 * @param  {[type]} res      [description]
	 * @param  {[type]} filePath [description]
	 * @return {[type]}          [description]
	 */
	replaceURL(res, filePath) {
		// 1. 获取url内的地址
		// 2. 判断地址是否有效（要在图片文件夹内）。
		// 3. 替换地址
		res = res.replace(URL_REG, (match, p1, p2, p3, offset) => {
			if (isRelativePath(p2)) {
				// console.log(p1, p2, p3);
				let lpath = path.join(path.dirname(filePath), p2);
				// windows是以\为分隔的，转换/分隔来处理。
				let llpath = lpath.split(path.sep).join('/');

				let reg = /^(.+\/)*(images|ossweb-img)/;
				let rpath = p2;
				if (llpath.match(reg)) {
					rpath = llpath.replace(reg, this.fenliPath+this.projectName);	
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
				log(LOG_NAME, 'copy file ' + dest);
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
				else { return Promise.reject(new Error("未找到别名("+aliases+")的分离地址"))}
			});
		} else {
			return Promise.resolve(url);
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
				fetch("http://api.egooidea.com/fenli_server/list")
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