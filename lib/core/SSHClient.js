"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const fs = tslib_1.__importStar(require("fs"));
const os = tslib_1.__importStar(require("os"));
const util = tslib_1.__importStar(require("util"));
const fetch = tslib_1.__importStar(require("node-fetch"));
const ssh2_1 = require("ssh2");
const utils_1 = require("../utils");
const cipher_1 = tslib_1.__importDefault(require("./cipher"));
const fsreadFile = util.promisify(fs.readFile);
const log = (0, utils_1.logger)('SSHClient');
const SERVER_CONFIG_FILENAME = "server_config.json";
class SSHClient {
    /**
     * 配置文件地址，为空，则使用默认位置
     * @param  {[type]} configPath [description]
     * @return {[type]}            [description]
     */
    constructor(configPath) {
        // 服务器配置文件地址
        this.useCipher = true;
        if (configPath) {
            this.useCipher = false;
        }
        this.configFilePath = configPath || (0, utils_1.getConfigURL)(SERVER_CONFIG_FILENAME);
        // this.configFilePath = getLocalURL(SERVER_CONFIG_FILENAME)
        // this.client = null;
        // this.serverCfg = null;
    }
    /**
     * 加载服务器配置，获取上传服务器的host,port等信息。
     * @return {[type]}            [description]
     */
    async loadServerConfig() {
        log((0, utils_1.logMsg)('load server config.', 'STEP'));
        if ((0, utils_1.isHttpPath)(this.configFilePath)) {
            try {
                const res = await fetch(this.configFilePath, {});
                if (res.ok) {
                    const json = await res.json();
                    const data = this.useCipher ? await this.cipherDecrypt(json) : json;
                    this.serverCfg = data;
                    return Promise.resolve(this.serverCfg);
                }
                else {
                    throw new Error(res.statusText);
                }
            }
            catch (err) {
                throw err;
            }
        }
        else {
            try {
                let absoluteConfigFilePath = path.resolve(this.configFilePath);
                this.serverCfg = require(absoluteConfigFilePath);
                return Promise.resolve(this.serverCfg);
            }
            catch (err) {
                throw err;
            }
        }
    }
    /**
     * 解密配置文件。解密的key存储在  ~/.egookey
     * @param  {[type]} contents [description]
     * @return {[type]}          [description]
     */
    async cipherDecrypt(contents) {
        let keypath = path.join(os.homedir(), '.egookey');
        try {
            const secret = await fsreadFile(keypath, 'utf8');
            const ciphers = (0, cipher_1.default)(secret);
            const decrypted = ciphers.decrypt(contents);
            let r;
            if (typeof decrypted == 'string') {
                r = JSON.parse(decrypted);
            }
            else {
                r = decrypted;
            }
            return Promise.resolve(r);
        }
        catch (error) {
            throw error;
        }
    }
    /**
     * 打开SSH连接
     * @param  {[type]} sshConfig {host,port,username,password}
     * @return {[type]}           [description]
     */
    connect() {
        log((0, utils_1.logMsg)('connecting...', 'STEP'));
        return new Promise((resolve, reject) => {
            let client = new ssh2_1.Client();
            client.on('ready', () => {
                this.client = client;
                log((0, utils_1.logMsg)('ssh connected.', 'STEP'));
                resolve();
            }).on('error', (err) => {
                reject(err);
            }).connect({
                host: this.serverCfg.host,
                port: this.serverCfg.port,
                username: this.serverCfg.username,
                password: this.serverCfg.password,
                forceIPv4: true
            });
        });
    }
    // 打开sftp连接
    openSFTP() {
        return new Promise((resolve, reject) => {
            this.client.sftp((err, sftp) => {
                if (err) {
                    reject(err);
                }
                else {
                    log((0, utils_1.logMsg)('sftp opened.', 'STEP'));
                    resolve(sftp);
                }
            });
        });
    }
    // 执行shell语句
    execCmd(cmd) {
        return new Promise((resolve, reject) => {
            this.client.exec(cmd, function (err, stream) {
                if (err) {
                    reject(err);
                }
                stream.on('end', function (code, signal) {
                    resolve();
                }).on('data', function (data) {
                    // log(LOG_NAME, colors.yellow('git output:::'));
                    console.log(data.toString());
                }).stderr.on('data', function (data) {
                    // log(LOG_NAME, colors.red('STDERR: ' + data));
                    console.log(data.toString());
                });
            });
        });
    }
    // 结束SSH连接
    close() {
        return new Promise((resolve, reject) => {
            try {
                this.client.end();
                log((0, utils_1.logMsg)('ssh closed.', 'STEP'));
                resolve();
            }
            catch (err) {
                reject(err);
            }
        });
    }
}
exports.default = SSHClient;
