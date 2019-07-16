/**
 * 因为域名经常被封。而一个新域名的启用非常麻烦——购买域名，域名备案，HTTPS支持等等繁琐操作，而且等待时间也很长。
 * 被封原因，不仅仅是因为敏感代码的原因，可能是因为虚假仿冒原因，所以，查找可以进行代码托管的地方。
 * coding.net。pages服务有限制。无法使用
 * gitee.com。pages暂没限制。
 *
 * 先上传到内部服务器，然后内部服务器git提交。
 * 每天，清理一次git仓库。
 */
let Uploader = require('./Uploader');
let colors = require('ansi-colors');
let SSHClient = require('../core/SSHClient');
let log = require('fancy-log');

const LOG_NAME = "GitUploader: ";
const SERVER_REMOTE_PATH = '/home/pata/pages';
const PAGES_URL = 'https://egdev.gitee.io/pages/prw/';

class GitUploader extends Uploader {
  constructor(localPath, remotePath) {
    super(localPath, remotePath);
    this.remotePath = SERVER_REMOTE_PATH + '/prw';
    this.previewUrl = PAGES_URL;
  }
  run(serverConfigPath = null, noCache = false, noFilter = false, shtmlReplaced = true) {
    this.serverConfigPath = serverConfigPath;
    return super.run(serverConfigPath, noCache, noFilter, shtmlReplaced).then(()=>{
      return this.sync()
    })
  }
  sync() {
    let ssh = new SSHClient(this.serverConfigPath);
    return ssh.loadServerConfig()
      .then(() => ssh.connect())
      .then(() => this.execGitCmd(ssh.client, 'status'))
      .then(() => this.execGitCmd(ssh.client, 'add . --all'))
      .then(() => this.execGitCmd(ssh.client, 'commit -m "update"'))
      .then(() => this.execGitCmd(ssh.client, 'push origin master'))
      .then(() => ssh.close())
      .catch((err) => {
        log(LOG_NAME, colors.red(err));
      });
  }
  // 执行Git命令
  execGitCmd(client, cmd) {
    log(LOG_NAME, colors.yellow('git -C ' + SERVER_REMOTE_PATH + ' ' + cmd));
    return new Promise((resolve, reject) => {
      client.exec('git -C ' + SERVER_REMOTE_PATH + ' ' + cmd, function (err, stream) {
        if (err) { reject(err); }

        stream.on('end', function (code, signal) {
          resolve();
        }).on('data', function (data) {
          // log(LOG_NAME, colors.yellow('git output:::'));
          console.log(data.toString());
        }).stderr.on('data', function (data) {
          // log(LOG_NAME, colors.red('STDERR: ' + data));
          console.log(data.toString());
        });
      })
    });
  }
}
module.exports = GitUploader;