let Client 	= require('ssh2').Client;
let colors = require('ansi-colors');
let log = require('fancy-log');
let {getLocalURL, getConfigURL, isHttpPath} = require('../utils');
let fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const os = require('os');
const util = require('util');
const fsreadFile = util.promisify(fs.readFile);
const fswriteFile = util.promisify(fs.writeFile);

const LOG_NAME = "SSHClient: ";
const SERVER_CONFIG_FILENAME = "server_config.json";

class SSHClient {
	/**
	 * 配置文件地址，为空，则使用默认位置
	 * @param  {[type]} configPath [description]
	 * @return {[type]}            [description]
	 */
	constructor(configPath){
		// 服务器配置文件地址
		this.useCipher = true;
		if (configPath) {
			this.useCipher = false;
		}
		this.configFilePath = configPath || getConfigURL(SERVER_CONFIG_FILENAME);
		// this.configFilePath = getLocalURL(SERVER_CONFIG_FILENAME)
		this.client = null;
		this.serverCfg = null;
	}

	/**
	 * 加载服务器配置，获取上传服务器的host,port等信息。
	 * @return {[type]}            [description]
	 */
	loadServerConfig() {
		log(LOG_NAME, colors.yellow('load server config.'));
		return new Promise((resolve, reject)=>{
			if (isHttpPath(this.configFilePath)) {
				try {
					fetch(this.configFilePath)
					.then((res) => res.json())
					.then((json) => {
						if (this.useCipher) {
							return this.cipherDecrypt(json);
						} else {
							return Promise.resolve(json);
						}
					}).then((data)=>{
						this.serverCfg = data;
						resolve(this.serverCfg);
					}).catch((err)=>{
						reject(err);
					});
				} catch(err) {
					reject(err);
				}
			} else {
				try {
					let absoluteConfigFilePath = path.resolve(this.configFilePath);
					this.serverCfg = require(absoluteConfigFilePath);
					resolve(this.serverCfg);
				} catch(err) {
					reject(err);
				}
			}
		})
	}
	
	/**
	 * 解密配置文件。解密的key存储在  ~/.egookey
	 * @param  {[type]} contents [description]
	 * @return {[type]}          [description]
	 */
	cipherDecrypt(contents){
		let keypath = path.join(os.homedir(), '.egookey');
		return fsreadFile(keypath, 'utf8').then((secret)=>{
			return require('./cipher')(secret);
		}).then((cipher)=>{
			return JSON.parse(cipher.decrypt(contents));
		}).catch((err)=>{log(LOG_NAME, colors.red(err));})
	}

	/**
	 * 打开SSH连接
	 * @param  {[type]} sshConfig {host,port,username,password}
	 * @return {[type]}           [description]
	 */
	connect() {
		log(LOG_NAME, colors.yellow('connecting...'));
		return new Promise((resolve, reject)=> {
			let client = new Client();
			client.on('ready', () => {
				this.client = client;
				log(LOG_NAME, colors.yellow('ssh connected.'));
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
		})
	}

	openSFTP(){
		return new Promise((resolve, reject)=>{
			this.client.sftp((err, sftp) => {
				if (err) { reject(err); }
				else {
					log(LOG_NAME, colors.yellow('sftp opened.'));
					resolve(sftp);
				}
			});
		})
	}
	// 结束SSH连接
	close() {
		return new Promise((resolve, reject) => {
			try{
				this.client.end();
				log(LOG_NAME, colors.yellow('ssh closed.'));
				resolve();
			}catch(err) {
				reject(err);
			}
		})
	}
}

module.exports = SSHClient;