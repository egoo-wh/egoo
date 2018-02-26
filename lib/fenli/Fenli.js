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

const HTML_REG = /("|\((\")?)(\.+\/)?(images|ossweb-img)/g;
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
		});
	}

	singleCopy(src, dest) {
		return new Promise((resolve, reject)=>{
			fs.copyFile(src, dest, (err)=>{
				if (err) { reject(err); }
				else { resolve(); }
			})
		})
	}

	/**
	 * 获取分离路径
	 */
	getFenliPath(aliases, url) {
		if (aliases) {
			return this.loadFenliData().then((data)=>{
				let _u = _.find(data, (o)=>o.product.indexOf(aliases.toLowerCase())>=0);
				return Promise.resolve(_u.url);
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
				fetch(getConfigURL(CONFIG_FILENAME))
				.then((res) => res.json())
				.then((json) => {
					resolve(json);
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