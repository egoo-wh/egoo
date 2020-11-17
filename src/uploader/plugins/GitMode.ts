import Uploader from "../Uploader";
import SSHClient from "../../core/SSHClient";
import { logger, logMsg } from '../../utils';

const log = logger('GitMode')
const SERVER_REMOTE_PATH = '/media/gitee/pages';

/**
 * git模式
 */
export default class GitMode {
  constructor(uploader: Uploader) {
    uploader.hooks.complete.tapPromise('GitModePlugin', () => {
      return this.sync(uploader)
    })
  }

  async sync(uploader: Uploader) {
    const ssh = uploader.ssh;
    await this.execGitCmd(ssh, 'status');
    await this.execGitCmd(ssh, 'add . --all')
    await this.execGitCmd(ssh, 'commit -m "update"')
    await this.execGitCmd(ssh, 'push origin master')
  }
  
  // 执行Git命令
  execGitCmd(ssh: SSHClient, cmd: string) {
    const sCmd = `git -C ${SERVER_REMOTE_PATH} ${cmd}`;
    log(logMsg(sCmd, 'STEP'));
    return ssh.execCmd(sCmd);
  }
}