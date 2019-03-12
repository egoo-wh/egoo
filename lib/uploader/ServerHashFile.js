let fs 				= require('fs');
let path 			= require('path');
let colors = require('ansi-colors');
let	crypto			= require('crypto');
let log = require('fancy-log');
let util = require('util');
let {serverPathJoin, sfcall} = require('../utils');

const fsunlink = util.promisify(fs.unlink);
const fsreadFile = util.promisify(fs.readFile);
const fswriteFile = util.promisify(fs.writeFile);

const LOG_NAME = 'ServerHashFile';

const hashCfg = {
	hasher: 'md5', // md5 || sha1
	hashKey: '',
	length: 32,
	file: 'filehash.json'
};

/**
 * 文本Hash对比类
 * 对比本地文件与服务器文件，一样则不上传，否则上传。需过滤的文件排除在外，总是上传。
 * 步骤：
 * 1.服务器下载hash文件
 * 2.解析hash文件
 * 3.本地文件生成hash值
 * 4.与本地文件hash对比，对比不同则加入上传列表
 * 5.所有hash值写入hash文件
 * 6.hash文件上传至服务器
 * 7.删除本地hash文件
 */
class ServerHashFile {
	/**
	 * 是否不使用缓存
	 * @param  {Boolean} noCache [description]
	 * @return {[type]}          [description]
	 */
	constructor(noCache = false) {
		this.noCache = noCache;
		this.hashLoaded = false;
		this.hashAssets = null;
		this.hashFilePath = null;
		this.hashServerPath = null;
		this.hashFileSaved = false;
	}

	// 从服务器加载并载入hash文件。
	include(sftp, localPath, remotePath) {
		if (this.noCache) { return Promise.resolve(); }
		this.hashFilePath = path.join(localPath, hashCfg.file);
		this.hashServerPath = serverPathJoin(remotePath, hashCfg.file);
		// 1.load server hash file
		return sfcall(sftp.fastGet, sftp, true, this.hashServerPath, this.hashFilePath).then((fileExist)=>{
			// 2.include it if file exists.
			if (fileExist) {
				log(LOG_NAME, colors.yellow('server hash file loaded.'));
				// 转换成绝对路径，require，不然，相对路径会导致报错。
				let absoluteHashFilePath = path.resolve(this.hashFilePath);
				try {
					this.hashAssets = require(absoluteHashFilePath) || {};
					log(LOG_NAME, colors.yellow('include hash file.'));
				} catch (err) {
					Promise.reject(new Error('require hash file error.'))
				}
				return Promise.resolve();
			} else {
				log(LOG_NAME, colors.yellow("server hash file isn't exists."));
				return Promise.resolve();
			}
		});
	}

	// 保存hash文件
	save() {
		if (this.noCache || !this.hashAssets) { return Promise.resolve(false); }
		return fswriteFile(this.hashFilePath, JSON.stringify(this.hashAssets)).then(()=>{
			this.hashFileSaved = true;
			log(LOG_NAME, colors.yellow('save hash file.'));
			return Promise.resolve(true);
		});
	}

	// 清除hash文件
	clear() {
		if (this.noCache) { return Promise.resolve(); }
		if (this.hashFileSaved && this.hashFilePath) {
			log(LOG_NAME, colors.yellow('remove hash file.'));
			return fsunlink(this.hashFilePath);
		} else {
			return Promise.resolve();
		}
	}
	// 比较文件hash值
	compare(file) {
		return fsreadFile(file).then((contents)=>{
			// Initialize results object
			let hashValue = '';

			let absoluteFilePath = path.resolve(file);

			// If file was already hashed, get old hash
			if (this.hashAssets && this.hashAssets[absoluteFilePath]) {
				hashValue = this.hashAssets[absoluteFilePath];
			}
			// Generate hash from content
			let newHashValue = this.generateHash(contents);

			// If hash was generated
			if (hashValue !== newHashValue) {
				hashValue = newHashValue;
				if (!this.hashAssets) {
					this.hashAssets = {};
				};

				// Add file to or update asset library
				this.hashAssets[absoluteFilePath] = hashValue;
				return Promise.resolve(false);
			}
			return Promise.resolve(true);
		})
	}
	// 生成hash值
	generateHash(contents) {
		if (contents) {
			return hashCfg.hashKey + crypto.createHash(hashCfg.hasher).update(contents).digest('hex').slice(0, hashCfg.length);
		}

		return '';
	}

	isNotHashFile(file) {
		return path.basename(file) !== hashCfg.file;	
	}
	
}

module.exports = ServerHashFile;