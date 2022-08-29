"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("../../utils");
const log = (0, utils_1.logger)('GitMode');
const SERVER_REMOTE_PATH = '/media/gitee/pages';
/**
 * git模式
 */
class GitMode {
    constructor(uploader) {
        uploader.hooks.complete.tapPromise('GitModePlugin', () => {
            return this.sync(uploader);
        });
    }
    async sync(uploader) {
        const ssh = uploader.ssh;
        await this.execGitCmd(ssh, 'status');
        await this.execGitCmd(ssh, 'add . --all');
        await this.execGitCmd(ssh, 'commit -m "update"');
        await this.execGitCmd(ssh, 'push origin master');
    }
    // 执行Git命令
    execGitCmd(ssh, cmd) {
        const sCmd = `git -C ${SERVER_REMOTE_PATH} ${cmd}`;
        log((0, utils_1.logMsg)(sCmd, 'STEP'));
        return ssh.execCmd(sCmd);
    }
}
exports.default = GitMode;
