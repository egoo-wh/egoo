let fs 				= require('fs');
let path 			= require('path');
let _ = require('lodash');
let gutil 		= require('gulp-util');
let FileModifier 	= require('./FileModifier');
let IllegalCodeMgr = require('./IllegalCodeMgr');
let {log} = require('../utils');
/**
 * HTML文件注释类
 * 将一些敏感代码进行注释。敏感代码为可能引发腾讯电脑管家等软件报恶意网站的代码（如QQ登录、统计代码等相关JS）。
 * 步骤：
 * 1.定义需要过滤的文件类型
 * 2.被修改文件（如index.html），将被修改成~index.html文件。
 * 3.将修改后的~index.html上传到服务器上对应位置的index.html
 * 4.上传结束，清除本地的~index.html文件
 *
 * 敏感代码文件由IllegalCodeMgr.js管理
 */
const needFilterFileExts = ['.html', '.shtml', '.htm'];

const LOG_NAME = 'HtmlCommenter';

class HtmlCommenter {

	constructor() {
		this.filterTemps = null;
	}

	add(file) {
		if (!this.filterTemps) { this.filterTemps = []; }
		let fileName = path.basename(file);
		if (fileName.substr(0, 1) !== '~') {
			let tempPath = path.join(file, '..', '~'+fileName);
			this.filterTemps.push({"src": file, "dest": tempPath});
			return tempPath;
		} else {
			return null;
		}
	}

	run() {
		let icm = new IllegalCodeMgr();
		return icm.getRules().then((rules)=>{
			if (this.filterTemps && this.filterTemps.length > 0) {
				log(LOG_NAME, gutil.colors.yellow('filter html illegal code.'));
				let all = _.chain(this.filterTemps)
				.map((temp) => {
					return FileModifier.modify(temp["src"], temp["dest"], rules);
				})
				.value();

				return Promise.all(all);
			} else {
				return Promise.resolve();
			}
		});
	}

	isNeedFilter(file) {
		return needFilterFileExts.indexOf(path.extname(file)) >= 0;
	}

	clear() {
		log(LOG_NAME, gutil.colors.yellow('remove temp files for filter.'));
		if (this.filterTemps && this.filterTemps.length > 0) {
			let all = _.chain(this.filterTemps)
				.map((temp) => {
					return new Promise((resolve, reject) => {
						fs.unlink(temp["dest"], (err) => {
							resolve();
						})
					})
				})
				.value();

			return Promise.all(all);
		} else {
			return Promise.resolve();
		}
	}
}

module.exports = HtmlCommenter;