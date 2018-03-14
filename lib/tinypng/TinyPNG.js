let fs = require('fs');
let path = require('path');
let Handler = require('../Handler');
let tinify = require("tinify");
let colors = require('ansi-colors');
let UserConf = require('../core/UserConf');
let DirUtil = require('../core/DirUtil');
let util = require('util');
let log = require('fancy-log');
let {showPrompt, bytesSizeFormat} = require('../utils/');

const LOG_NAME = 'TinyPNG';

class TinyPNG extends Handler {
	constructor(source) {
		super();

		this.source = source;

		UserConf.getInstance().include()
		.then(()=>this.showPromptIfNoApiKey())
		.then(({key, fromInput})=>{
			return this.run(source, key).then(()=>{
				if (fromInput) {
					UserConf.getInstance().add('tinypng.api_key', key);
					return UserConf.getInstance().save();
				} else {
					return Promise.resolve();
				}
			});
		}).catch((err)=>{
			console.log(err);
		})
	}

	showPromptIfNoApiKey() {
		let key = UserConf.getInstance().get('tinypng.api_key');
		if (key) {
			return Promise.resolve({key:key, fromInput:false});
		} else {
			return showPrompt([{name: 'apikey', message: 'TinyPNG API KEY'}]).then((result)=>{
				return Promise.resolve({key:result.apikey, fromInput:true});
			})
		}
	}

	run(source, apikey) {
		tinify.key = apikey;
		return DirUtil.walkFile(source, ({filePath, type}) => {
			let _extName = path.extname(filePath);
			if (type == 'file' && (_extName == '.png' || _extName == '.jpg')) {
				return this.compress(filePath);
			} else {
				return Promise.resolve();
			}
		});
	}

	compress(file) {
		return new Promise((resolve, reject)=>{
			fs.lstat(file, (err, stats)=>{
				if (err) { reject(err);}
				else { resolve(stats); }
			})
		}).then((stats)=>{
			return new Promise((resolve, reject)=>{
				let source = tinify.fromFile(file);
				let result = source.result();
				result.size((err, size)=>{
					if (err) {

					}else {
						log(LOG_NAME, 'compress '+colors.cyan(path.relative(this.source, file))+' from '+bytesSizeFormat(stats.size)+' to '+colors.green(bytesSizeFormat(size)));	
					}
				});
				result.toFile(file, (err)=>{
					if (err) { reject(err); }
					else { 
						resolve(); 
					}
				});
			});
		})
	}
}

module.exports = TinyPNG;