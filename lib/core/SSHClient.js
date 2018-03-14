let Client 	= require('ssh2').Client;
let colors = require('ansi-colors');
let log = require('fancy-log');

const LOG_NAME = "SSHClient: ";

class SSHClient {
	constructor(){
		this.client = null;
	}
	
	/**
	 * 打开SSH连接
	 * @param  {[type]} sshConfig {host,port,username,password}
	 * @return {[type]}           [description]
	 */
	connect({host,port,username,password}) {
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
				host: host,
				port: port,
				username: username,
				password: password,
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