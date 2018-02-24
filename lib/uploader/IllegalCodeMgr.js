'use strict';
let fs 				= require('fs');
let path 			= require('path');
let fetch = require('node-fetch');
let gutil 		= require('gulp-util');

let {log, getConfigURL} = require('../utils');


const FILENAME = 'illegal_code_manifest.json';
const LOG_NAME = 'IllegalCodeMgr';
const UPDATE_INTERVAL = 86400 * 2; // 更新检测的间隔时间 s

/**
 * 敏感代码规则文件的管理类，包含下载，引入，检测更新等
 */
class IllegalCodeMgr {

	constructor() {
		// 规则文件地址
		this.filePath = path.join(global.rootPath, 'data', FILENAME);

		this.assets = null;
	}

	checkUpdate() {
		let _t = global.userConf.get('uploader.illegal_code_update_time');
		if (!_t || new Date().getTime() - _t > UPDATE_INTERVAL * 1000) {
			return true;
		} else {
			return false;
		}
	}

	// 加载规则文件
	load() {
		if (this.checkUpdate()) {
			return new Promise((resolve, reject)=>{
				try {
					fetch(getConfigURL(FILENAME))
					.then((res) => {
						var dest = fs.createWriteStream(this.filePath);
						res.body.pipe(dest).on("finish", ()=>{
							global.userConf.add('uploader.illegal_code_update_time', new Date().getTime());
							resolve(true);
						});
					}).catch((err)=>{
						resolve(false);
					});
				} catch(err) {
					resolve(false);
					// reject(err);
				}
			})	
		} else {
			return Promise.resolve(false);
		}
	}

	include() {
		return new Promise((resolve, reject)=>{
			try {
				this.assets = require(this.filePath) || {};
				log(LOG_NAME, gutil.colors.yellow('include illegal code rules.'));
			} catch (err) {
				throw err;
			}
			resolve();
		})
	}

	// 获取所有的过滤规则
	getRules() {
		return this.load()
			.then((fromURL)=>{
				return this.include().then(()=>{
					if (fromURL) {
						return global.userConf.save();
					} else {
						return Promise.resolve();
					}
				})
			})
			.then(()=>Promise.resolve(this.assets['rules']));
	}
}

module.exports = IllegalCodeMgr;