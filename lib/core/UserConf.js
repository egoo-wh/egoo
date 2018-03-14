let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let colors = require('ansi-colors');
let log = require('fancy-log');

const USER_CONFIG_FILENAME = 'user_conf.json';
const LOG_NAME = 'UserConf: ';

/**
 * 管理用户配置
 * 单例
 */
class UserConf {
	constructor() {
		this.assets = null;
		this.included = false;
		this.confPath = path.join(global.rootPath, 'data', USER_CONFIG_FILENAME);
	}

	/**
	 * 使用UserConf时，需首先include.
	 * @return {[type]} [description]
	 */
	include() {
		if (!this.included) {
			return this.createDataDir().then((exists)=>{
				if (!exists) { log(LOG_NAME, colors.red("找不到data文件夹")); return; }
				try {
					this.assets = require(this.confPath) || {};
					log(LOG_NAME, colors.yellow('include user conf.'));
				} catch (err) {
					// no user conf file.
				}
				return Promise.resolve();
			})
		}else {
			return Promise.resolve();
		}
	}

	createDataDir() {
		let dataDir = path.join(global.rootPath, 'data');
		return new Promise((resolve, reject)=>{
			fs.lstat(dataDir, (err, stats)=>{
				if (err) { 
					fs.mkdir(dataDir, 0o777, (err)=>{
						if (err) { reject(err); }
						else { resolve(true); }
					})
				}else {
					resolve(true);
				}
			})
		})
		
	}

	/**
	 * 添加配置
	 * @param {[type]} name  属性名 key.subkey...   
	 * @param {[type]} value [description]
	 */
	add(name, value) {
		if (!this.assets) { this.assets = {}; }
		let keys = name.split('.');
		_.reduce(keys, (result, k, i)=>{
			if (i < keys.length - 1) {
				if (!result[k]) {
					result[k] = {};
				}
				return result[k];	
			} else {
				result[k] = value;
				return result;
			}
		}, this.assets);
	}

	get(name){
		let keys = name.split('.');
		return _.reduce(keys, (result, k, i)=>{
			return result?result[k]:null;
		}, this.assets);
	}

	save(){
		return new Promise((resolve, reject)=>{
			if (this.assets) {
				fs.writeFile(this.confPath, JSON.stringify(this.assets), function(err) {
					if (err) { reject(err); }
					resolve();
				})
				log(LOG_NAME, colors.yellow('save user conf.'));
			} else {
				resolve();
			}
		})
	}
}

UserConf.__instance = null;
UserConf.getInstance = () => {
	if (!UserConf.__instance) {
		UserConf.__instance = new UserConf();
	}
	return UserConf.__instance;
}

module.exports = UserConf;