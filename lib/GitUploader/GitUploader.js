/**
 * 因为域名经常被封。而一个新域名的启用非常麻烦——申请域名，域名备案，HTTPS支持等等繁琐操作，而且等待时间也很长。
 * 被封原因，不仅仅是因为敏感代码的原因，可能是因为虚假仿冒原因，所以，查找可以进行代码托管的地方。
 * coding.net。pages服务有限制。无法使用
 * gitee.com。pages暂没限制。
 *
 * 先上传到内部服务器，然后内部服务器git提交。
 * 每天，清理一次git仓库。
 */

let path = require('path');
let colors = require('ansi-colors');
let Handler = require('../Handler');
let SSHClient = require('../core/SSHClient');
let Uploader = require('../uploader/Uploader');
let log = require('fancy-log');

const LOG_NAME = "GitUploader: ";
const SERVER_REMOTE_PATH = '/mnt/pages/prw';
const GIT_CMD = 'git -C /mnt/pages ';
const PAGES_URL = 'http://egdev.gitee.io/pages/prw/';

class GitUploader extends Handler {
	constructor(localPath, serverConfigPath){
		super();
		let uploader = new Uploader(localPath, SERVER_REMOTE_PATH, false, false, serverConfigPath, true);
		uploader.run()
		.then(()=>this.run(uploader))
		.catch((err)=>{
			log(LOG_NAME, colors.red(err));
			process.exit(1, LOG_NAME + err);
		});
	}

	run(uploader) {
		let ssh = new SSHClient();
		return ssh.connect({
			host: '192.168.1.11',
			port: 22,
			username: 'egoo-server',
			password: 'egoo-server'
		})
		.then(()=>this.execGitCmd(ssh.client, 'status'))
		.then(()=>this.execGitCmd(ssh.client, 'add . --all'))
		.then(()=>this.execGitCmd(ssh.client, 'commit -m "update"'))
		.then(()=>this.execGitCmd(ssh.client, 'push origin master'))
		.then(()=>ssh.close())
		.then(()=>{
			if (uploader && !uploader.isFile) {
				log(LOG_NAME, 'preview url: ', colors.underline(PAGES_URL + path.basename(uploader.localPath) +'/' + (uploader.indexFileName?uploader.indexFileName:'')));
			}
		}).catch((err)=>{
			log(LOG_NAME, colors.red(err));
		});
	}
	// 执行Git命令
	execGitCmd(client, cmd) {
		log(LOG_NAME, colors.yellow('git -C /mnt/pages '+cmd));
		return new Promise((resolve, reject)=>{
			client.exec('git -C /mnt/pages '+cmd, function(err, stream){
				if (err) { reject(err); }

				stream.on('end', function(code, signal) {
					resolve();
				}).on('data', function(data) {
					// log(LOG_NAME, colors.yellow('git output:::'));
					console.log(data.toString());
				}).stderr.on('data', function(data) {
					// log(LOG_NAME, colors.red('STDERR: ' + data));
					console.log(data.toString());
				});
			})
		});
	}
}

module.exports = GitUploader;