let fs = require('fs');
let path = require('path');
let Handler = require('../Handler');
let tinify = require("tinify");
let gutil 		= require('gulp-util');
let DirUtil = require('../utils/DirUtil.js');
let util = require('util');
let {log, showPrompt, bytesSizeFormat} = require('../utils/');

const LOG_NAME = 'TinyPNG';

class TinyPNG extends Handler {
	constructor(source) {
		super();

		this.source = source;

		this.showPromptIfNoApiKey()
		.then(({key, fromInput})=>{
			return this.run(source, key).then(()=>{
				if (fromInput) {
					global.userConf.add('tinypng.api_key', key);
					return global.userConf.save();
				} else {
					return Promise.resolve();
				}
			});
		}).catch((err)=>{
			console.log(err);
		})
	}

	showPromptIfNoApiKey() {
		let key = global.userConf.get('tinypng.api_key');
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
						log(LOG_NAME, 'compress '+gutil.colors.cyan(path.relative(this.source, file))+' from '+bytesSizeFormat(stats.size)+' to '+gutil.colors.green(bytesSizeFormat(size)));	
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