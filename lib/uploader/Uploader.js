'use strict';
let fs = require('fs');
let path = require('path');
let _ = require('lodash');
let DirUtil = require('../core/DirUtil');
let Handler = require('../Handler');
let log = require('fancy-log');
let colors = require('ansi-colors');
let {serverPathJoin, sfcall} = require('../utils');
let util = require('util');
let SSHClient = require('../core/SSHClient');
let ServerHashFile = require('./ServerHashFile');
let HtmlCommenter = require('./patcher/HtmlCommenter');
let ServerSideInclude = require('./patcher/ServerSideInclude');
let FilePatch = require('./patcher/FilePatch');

const fslstat = util.promisify(fs.lstat);

const LOG_NAME = 'Uploader: ';
const ERR_NAME = 'Uploader Err: ';
const PREVIEW_URL = 'http://prvw.egoodev.cn/';
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
	 */
	constructor(localPath, remotePath) {
		super();

		this.localPath = localPath;
		this.remotePath = remotePath;
		this.isFile = false; // localPath是文件还是文件夹

		this.querys = []; // 上传队列
		this.sftp = null; // ssh2 sftp
		this.ssh = null;
		this.serverHash = null;
		this.filePatch = null;

		this.indexFileName = null; // index文件名，供访问地址用。
		this.previewUrl = PREVIEW_URL;
	}
	/**
	 * 开始运行
	 * @param  {[String]} serverConfigPath  配置文件地址，默认为http://192.168.1.11/static/server_config.json
	 * @param  {[Boolean]}	noCache		是否引用缓存
	 * @param {Booleam} noFilter 是否过滤腾讯登录组件和统计代码
	 * @param  {[Boolean]} shtmlReplaced 是否替换shtml include模块
	 * @return {[type]} [description]
	 */
	run(serverConfigPath = null, noCache = false, noFilter = true, shtmlReplaced = false) {
		this.ssh = new SSHClient(serverConfigPath);
		this.serverHash = new ServerHashFile(noCache);
		this.filePatch = new FilePatch();
		if (!noFilter) {
			this.filePatch.register(new HtmlCommenter())
		}
		if (shtmlReplaced) {
			this.filePatch.register(new ServerSideInclude());
		}
		// this.commenter = new HtmlCommenter(shtmlReplaced);

		return this.ssh.loadServerConfig()
			.then((conf) => {
				// 如果未指定remotePath，则从配置中获取
				if (!this.remotePath) {
					this.remotePath = conf.path;
				}
				return Promise.resolve();
			})
			.then(() => this.isLocalPathValid())
			.then(() => this.ssh.connect())
			.then(() => this.ssh.openSFTP())
			.then((sftp) => {
				this.sftp = sftp;
				return this.serverHash.include(sftp, this.localPath, this.remotePath);
			})
			.then(() => this.buildQuery())
			.then(() => {
				return this.serverHash.save().then((saved)=>{
					if (saved) {
						this.querys.push(new QueryInfo(this.serverHash.hashFilePath, this.serverHash.hashServerPath, 'file'));	
					}
				});
			})
			.then(() => this.filePatch.exec())
			.then(() => this.uploadQuerys(this.sftp, this.querys))
			.then(() => this.serverHash.clear())
			.then(() => this.filePatch.clear())
			.then(() => this.ssh.close())
			.catch((err)=>{
				log(colors.red(ERR_NAME + err));
				process.exit(1, ERR_NAME + err);
			})
	}

	// 判断本地待上传的文件路径是否合法
	isLocalPathValid() {
		return fslstat(this.localPath).then((stats)=>{
			if (stats.isDirectory()) {
				this.remotePath = serverPathJoin(this.remotePath, path.basename(this.localPath));
			} else {
				this.isFile = true;
				this.noCache = true;
			}
		}).catch(err=>{
			log(LOG_NAME, colors.red(`上传路径:${this.localPath} 不正确`));
			return Promise.reject('localPath error');
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
				if (this.filePatch.detect(filePath)) {
					let bn = path.basename(filePath);
					let ext = path.extname(bn);
					if (path.basename(filePath, ext) == 'index') { this.indexFileName = bn; }
					
					// 需过滤的文件，过滤文件每次都上传。
					let tempFilePath = this.filePatch.add(filePath);
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
								log(LOG_NAME, 'skip '+colors.gray(_.isArray(rtPath)?rtPath.join(path.sep):rtPath));
							}
						});	
					}
				}
			}
		});
	}
	// 上传队列
	uploadQuerys(sftp, querys) {
		log(LOG_NAME, colors.yellow('query load start.'));
		return new Promise((resolve, reject) => {
			this.uploadQuery(sftp, querys, 0)
			.then((finish) =>{
				if (finish) {
					log(LOG_NAME, colors.yellow('query upload finish.'))
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
					log(LOG_NAME, 'mkdir: '+ colors.cyan(dest))
					// mkdir.
					return sfcall(sftp.mkdir, sftp, false, dest);
				}else {
					return dirExists;
				}
			}).then((dirExists)=>{
				if (!dirExists) {
					// change dir file mode. so can put files into it.
					log(LOG_NAME, 'chmod directory: ' + colors.cyan(dest));
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
					log(LOG_NAME, 'rm: '+colors.cyan(dest));
					return sfcall(sftp.unlink, sftp, false, dest);
				};
			}).then(()=>{
				// upload file.
				log(LOG_NAME, 'cp: ' + colors.cyan(src) +' > '+ colors.cyan(dest));
				return sfcall(sftp.fastPut, sftp, false, src, dest);
			}).then(()=>{
				// upload complete. next.
				loadIndex++;
				return this.uploadQuery(sftp, query, loadIndex);
			});
		}
		return p;
	}
	
	// 强制停止(ctrl-c)的处理。一些清除操作。
	shutdownHandler() {
		super.shutdownHandler();
		this.serverHash.clear();
		this.filePatch.clear();
	}
}

module.exports = Uploader;