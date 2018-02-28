'use strict';
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let gutil = require('gulp-util');
let Client 	= require('ssh2').Client;
let DirUtil = require('../core/DirUtil.js');
let Handler = require('../Handler');
let ServerHashFile = require('./ServerHashFile');
let HtmlCommenter = require('./HtmlCommenter');
let {log, serverPathJoin, sfcall, getConfigURL} = require('../utils');
let fetch = require('node-fetch');

const CONFIG_FILENAME = "server_config.json";
const LOG_NAME = 'Uploader: ';
const ERR_NAME = 'Uploader Err: ';

/**
 * 上传列表单个信息
 */
class QueryInfo {
	/**
	 * 上传文件信息
	 * @param  {[String]} src  原路径
	 * @param  {[String]} dest 目标路径
	 * @param  {[String]} type 文件类型 dir/file
	 * @return {[type]}      [description]
	 */
	constructor(src, dest, type) {
		this.src = src;
		this.dest = dest;
		this.type = type;
	}

	toString() {
		return this.src + " > " + this.dest;
	}
}

/**
 * 文件上传类
 */
class Uploader extends Handler {
	/**
	 * @param  {[String]}	localPath 	本地路径
	 * @param  {[String]}	remotePath 	要上传的路径
	 * @param  {[Boolean]}	isRemoteServer 	是否外网服务器	
	 * @param  {[Boolean]}	noCache		是否引用缓存
	 */
	constructor(localPath, remotePath, isRemoteServer, noCache, callback) {
		super();
		let k = isRemoteServer ? 'dist' : 'local';

		this.serverCfg = null;
		this.localPath = localPath;
		this.remotePath = remotePath;
		this.noCache = noCache;
		this.isFile = false; // localPath是文件还是文件夹

		this.querys = []; // 上传队列
		this.client = null;
		this.sftp = null;
		this.serverHash = new ServerHashFile();
		this.commenter = new HtmlCommenter();

		this.indexFileName = null; // index文件名，供访问地址用。

		// 配置文件地址
		this.configFilePath = path.join(global.rootPath, 'data', CONFIG_FILENAME);

		this.loadServerConfig()
		.then(()=>{
			// 如果未指定remotePath，则从配置中获取
			 if (!this.remotePath) {
			 	this.remotePath = this.serverCfg[k].path;
			 }
			 return Promise.resolve();
		})
		.then(()=>this.isLocalPathValid())
		.then(()=>this.openSSHConnect(this.serverCfg[k]))
		.then(({client, sftp})=>{
			this.client = client;
			this.sftp = sftp;
			if (!this.noCache) {
				return this.serverHash.include(sftp, this.localPath, this.remotePath);
			} else {
				return Promise.resolve();
			}
		})
		// TODO: 这里直接使用.then(this.buildQuery)不行，会导致buildQuery方法里的this为undefined。
		.then(()=>this.buildQuery())
		.then(()=>{
			if (!this.noCache) {
				return this.serverHash.save().then((saved)=>{
					if (saved) {
						this.querys.push(new QueryInfo(this.serverHash.hashFilePath, this.serverHash.hashServerPath, 'file'));	
					}
				});
			} else {
				return Promise.resolve();
			}
		})
		.then(()=>this.commenter.run())
		.then(()=>this.uploadQuerys(this.sftp, this.querys))
		.then(()=>{
			if (!this.noCache) {
				return this.serverHash.clear()
			} else {
				return Promise.resolve();
			}
		})
		.then(()=>this.commenter.clear())
		.then(()=>this.endSSHConnect(this.client))
		.then(()=>{
			log(LOG_NAME, gutil.colors.green('publish success.'));

			// if (!this.isFile) {
			// 	let BASE_URL;
			// 	if (isRemoteServer) { BASE_URL = 'http://preview.egoodev.cn/'; }
			// 	else { BASE_URL = 'http://192.168.1.11/preview/'; }
			// 	log(LOG_NAME, 'preview url: ' + gutil.colors.underline(BASE_URL + path.basename(localPath) +'/' + this.indexFileName));
			// }
			
			callback && callback(this);
		})
		.catch((err)=>{
			log(gutil.colors.red(ERR_NAME + err));
			process.exit(1, ERR_NAME + err);
		})
	}
	// 加载服务器配置，获取上传服务器的host,port等信息。
	loadServerConfig() {
		log(LOG_NAME, gutil.colors.yellow('load server config.'));
		return new Promise((resolve, reject)=>{
			try {
				fetch(getConfigURL(CONFIG_FILENAME))
				.then((res) => res.json())
				.then((json) => {
					this.serverCfg = json;
					resolve();
				}).catch((err)=>{
					reject(err);
				});
			} catch(err) {
				reject(err);
			}
		})	
	}

	// 判断本地待上传的文件路径是否合法
	isLocalPathValid() {
		return new Promise((resolve, reject)=>{
			fs.lstat(this.localPath, (err, stats)=>{
				if (err) { reject(err);}
				else {
					if (stats.isDirectory()) {
						this.remotePath = serverPathJoin(this.remotePath, path.basename(this.localPath));
					} else {
						this.isFile = true;
						this.noCache = true;
					}
					resolve();
				}
			})
		})
	}
	// 创建上传队列
	buildQuery() {
		return DirUtil.walkFile(this.localPath, ({filePath, type})=>{
			// console.log("path:"+filePath+" type:"+type);
			let rtPath;
			if (this.isFile) {
				rtPath = path.basename(filePath);
			} else {
				rtPath = path.relative(this.localPath, filePath).split(path.sep);
			}

			if (type == 'dir') {
				this.querys.push(new QueryInfo(filePath, serverPathJoin(this.remotePath, rtPath), type));
			} else {
				if (this.commenter.isNeedFilter(filePath)) {

					let bn = path.basename(filePath);
					let ext = path.extname(bn);
					if (path.basename(filePath, ext) == 'index') { this.indexFileName = bn; }
					
					// 需过滤的文件，过滤文件每次都上传。
					let tempFilePath = this.commenter.add(filePath);
					if (tempFilePath) {
						this.querys.push(new QueryInfo(tempFilePath, serverPathJoin(this.remotePath, rtPath), type));
					}
				}else {
					if (this.serverHash.isNotHashFile(filePath)) {
						// hash compare.对比文件hash，只上传hash值不同的文件。
						return this.serverHash.compare(filePath).then((equal)=>{
							if (!equal) {
								this.querys.push(new QueryInfo(filePath, serverPathJoin(this.remotePath, rtPath), type));
							}else {
								log(LOG_NAME, gutil.colors.gray('skip '+rtPath));
							}
						});	
					}
				}
			}
		});
	}
	// 上传队列
	uploadQuerys(sftp, querys) {
		log(LOG_NAME, gutil.colors.yellow('query load start.'));
		return new Promise((resolve, reject) => {
			this.uploadQuery(sftp, querys, 0)
			.then((finish) =>{
				if (finish) {
					log(LOG_NAME, gutil.colors.yellow('query upload finish.'))
					resolve();
				}else {
					reject('query upload errors somewhere.');
				}
			})
			.catch((err) => {
				reject(err);
			});
		});
	}	
	// 上传队列中的单独项
	uploadQuery(sftp, query, loadIndex) {
		if (loadIndex === query.length) {
			query = null;
			return true;
		};

		let {src, dest, type} = query[loadIndex];
		let p;
		if (type === 'dir') {
			p = sfcall(sftp.opendir, sftp, true, dest).then((dirExists)=>{
				if (!dirExists) {
					log(LOG_NAME, 'mkdir: '+ gutil.colors.cyan(dest))
					// mkdir.
					return sfcall(sftp.mkdir, sftp, false, dest);
				}else {
					return dirExists;
				}
			}).then((dirExists)=>{
				if (!dirExists) {
					// change dir file mode. so can put files into it.
					log(LOG_NAME, 'chmod directory: ' + gutil.colors.cyan(dest));
					return sfcall(sftp.chmod, sftp, false, dest, '0777');	
				}
			}).then(()=>{
				// upload complete. next.
				loadIndex++;
				return this.uploadQuery(sftp, query, loadIndex);
			})
		}else if(type === 'file') {
			p = sfcall(sftp.open, sftp, true, dest, 'r').then((fileExists)=>{
				// if file exits, delete it.
				if (fileExists) {
					log(LOG_NAME, 'rm: '+gutil.colors.cyan(dest));
					return sfcall(sftp.unlink, sftp, false, dest);
				};
			}).then(()=>{
				// upload file.
				log(LOG_NAME, 'cp: ' + gutil.colors.cyan(src) +' > '+ gutil.colors.cyan(dest));
				return sfcall(sftp.fastPut, sftp, false, src, dest);
			}).then(()=>{
				// upload complete. next.
				loadIndex++;
				return this.uploadQuery(sftp, query, loadIndex);
			});
		}
		return p;
	}
	// 打开SSH连接
	openSSHConnect(sshConfig) {
		return new Promise((resolve, reject)=> {
			let client = new Client();
			client.on('ready', () => {
				client.sftp((err, sftp) => {
					if (err) { reject(err); }

					log(LOG_NAME, gutil.colors.yellow('ssh connect open.'));
					resolve({client, sftp});
				});
			}).on('error', (err) => {
				reject(err);
			}).connect({
				host: sshConfig.host,
				port: sshConfig.port,
				username: sshConfig.username,
				password: sshConfig.password,
				forceIPv4: true
			});
		});
	}
	// 结束SSH连接
	endSSHConnect(client) {
		return new Promise((resolve, reject) => {
			try{
				client.end();
				log(LOG_NAME, gutil.colors.yellow('ssh connect end.'));
				resolve();
			}catch(err) {
				reject(err);
			}
		})
	}
	// 强制停止(ctrl-c)的处理。一些清除操作。
	shutdownHandler() {
		super.shutdownHandler();
		this.serverHash.clear();
		this.commenter.clear();
	}
}

module.exports = Uploader;