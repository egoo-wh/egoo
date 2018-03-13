/**
 * 因为域名经常被封。而一个新域名的启用非常麻烦——申请域名，域名备案，HTTPS支持等等繁琐操作，而且等待时间也很长。
 * 被封原因，不仅仅是因为敏感代码的原因。
 * 所以，查找可以进行代码托管的地方。
 * coding.net。pages服务有限制。无法使用
 * gitee.com。pages暂没限制。
 *
 * 先上传到内部服务器，然后内部服务器git提交。
 * 每天，清理一次git仓库。
 */

let path = require('path');
let gutil = require('gulp-util');
let Uploader = require('../uploader/Uploader');
let Client = require('ssh2').Client;
let {log} = require('../utils/');

const LOG_NAME = "GitUploader: ";
const SERVER_REMOTE_PATH = '/mnt/pages/prw';
const GIT_CMD = 'git -C /mnt/pages sync';
const PAGES_URL = 'http://egdev.gitee.io/pages/prw/';

class GitUploader {
	constructor(localPath, isSync){
		if (isSync) {
			this.runGitCmd()
		} else {
			this.runUpload(localPath).then((uploader)=>{
				return this.runGitCmd(uploader);
			}).catch((err)=>{
				log(LOG_NAME, gutil.colors.red(err));
			})	
		}
	}
	// 先上传至内部服务器
	runUpload(localPath) {
		return new Promise((resolve, reject)=>{
			new Uploader(localPath, SERVER_REMOTE_PATH, false, false, resolve);
		})
	}
	// Git提交
	runGitCmd(uploader) {
		log(LOG_NAME, gutil.colors.yellow('git sync start.'));
		return new Promise((resolve, reject)=>{
			var client = new Client();
			client.on('ready', function() {
				client.exec(GIT_CMD, function(err, stream){
					if (err) { reject(err); }

					stream.on('end', function(code, signal) {
						log(LOG_NAME, gutil.colors.green('git sync success.'));
						client.end();
						if (uploader && !uploader.isFile) {
							log(LOG_NAME, 'preview url: ', gutil.colors.underline(PAGES_URL + path.basename(uploader.localPath) +'/' + (uploader.indexFileName?uploader.indexFileName:'')));
						}
					}).on('data', function(data) {
						log(LOG_NAME, gutil.colors.yellow('git output:::'));
						console.log(data.toString());
					}).stderr.on('data', function(data) {
						// log(LOG_NAME, gutil.colors.red('STDERR: ' + data));
						console.log(data.toString());
					});
				})
			}).on('end', function() {
				resolve();
			}).connect({
				host: '192.168.1.11',
				port: 22,
				username: 'egoo-server',
				password: 'egoo-server'
			});
		});
	}
}

module.exports = GitUploader;