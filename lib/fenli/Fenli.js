/**
 * 分离工具。做下列几件事情：
 * 	- 复制并重命名（项目名后面加“分离后”）整个包	
	- 图片分离，只分离html文件(.htm,.html,.shtml,.inc)和css文件
	- 去掉html文件中绝对路径前的http(s):
 */

let fs = require('fs');
let path = require('path');
let gutil = require('gulp-util');
let Handler = require('../Handler');
let DirUtil = require('../core/DirUtil.js');
let FileModifier 	= require('../core/FileModifier');
let fetch = require('node-fetch');
let {log, getConfigURL} = require('../utils/');
let _ = require('lodash');

const PROJECT_SUFFIX = '分离后';

const LOG_NAME = "Fenli: ";
const CONFIG_FILENAME = "fenli_addr.json";

const HTML_REG = /("|\((\"|\')?)(\.+\/)?(images|ossweb-img)/g;
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
			log(LOG_NAME, 'use ' + gutil.colors.green(this.fenliPath));
			return this.run(source);
		}).catch((err)=>{
			log(LOG_NAME, gutil.colors.red(err));
		});
	}

	run(source) {
		DirUtil.walkFile(source, ({filePath, type}) => {
			let _extName = path.extname(filePath);
			let _d = path.join(this.dest, path.relative(this.source, filePath));
			// console.log(_d);
			if (type == 'file') {
				if (['.html', '.htm', '.shtml', '.inc'].indexOf(_extName) >= 0) {
					return FileModifier.modify(filePath, _d, [
						{"pattern":HTML_REG,"replacement":"$1"+this.fenliPath+this.projectName},
						{"pattern":HTTP_REG,"replacement":""}
					]);
				} else if (['.css'].indexOf(_extName) >= 0) {
					return FileModifier.modify(filePath, _d, [
						{"pattern":HTML_REG,"replacement":"$1"+this.fenliPath+this.projectName}
					]);
				} else {
					return this.singleCopy(filePath, _d);
				}
			} else {
				return this.singleCopy(filePath, _d);
			}
		}).catch((err)=>{
			log(LOG_NAME, gutil.colors.red(err));
		});
	}

	/**
	 * 复制文件。 如果目标地址是文件夹，而且已存在，则不复制。否则，创建文件夹。
	 * @param  {[type]} src  [description]
	 * @param  {[type]} dest [description]
	 * @return {[type]}      [description]
	 */
	singleCopy(src, dest) {
		return this.fileExists(src).then((ss)=>{
			if (ss == 2) {
				return this.fileExists(dest).then((s)=>{
					if (s == 2) {
						return Promise.resolve();
					} else {
						log(LOG_NAME, 'create dir ' + dest);
						return new Promise((resolve, reject)=>{
							fs.mkdir(dest, 0o777, (err)=>{
								if (err) { reject(err); }
								else { resolve(); }
							})
						});
					}
				})
			} else {
				log(LOG_NAME, 'copy file ' + dest);
				return new Promise((resolve, reject)=>{
					fs.copyFile(src, dest, (err)=>{
						if (err) { reject(err); }
						else { resolve(); }
					})
				})
			}
		});
	}
	/**
	 * 获取文件状态
	 * @param  {[type]} path [description]
	 * @return {[type]}      [description]
	 */
	fileExists(path) {
		return new Promise((resolve, reject)=>{
			fs.stat(path, (err, stats)=>{
				if (err) { resolve(0); }
				else {
					resolve(stats.isDirectory()?2:1);
				}
			})
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
		log(LOG_NAME, gutil.colors.yellow('load fenli data.'));
		return new Promise((resolve, reject)=>{
			try {
				// fetch(getConfigURL(CONFIG_FILENAME))
				fetch("http://api.egooidea.com/fenli_server/list")
				.then((res) => res.json())
				.then((data) => {
					if (data && data['ret'] == 0) {
						resolve(data.data);
					}else {
						log(LOG_NAME, gutil.colors.red('load fenli data error.'));
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