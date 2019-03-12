let path 			= require('path');
let _ = require('lodash');
let IllegalCodeMgr = require('../IllegalCodeMgr');
let log = require('fancy-log');
let colors = require('ansi-colors');
let Patcher = require('./Patcher');
/**
 * HTML文件注释类
 * 将一些敏感代码进行注释。
 * 敏感代码为可能引发腾讯电脑管家等软件报恶意网站的代码（如QQ登录、统计代码等相关JS）。
 * 
 * 敏感代码文件由IllegalCodeMgr.js管理
 */

const needFilterFileExts = ['.html', '.shtml', '.htm'];
const LOG_NAME = 'HtmlCommenter';

class HtmlCommenter extends Patcher {

	constructor() {
		super();
		this.name = 'HtmlCommenter';
		this.rules = null;
	}

	beforeRun(){
		let icm = new IllegalCodeMgr();
		return icm.getRules().then((rules) => {
			this.rules = rules;
		})
	}

	run(res) {
		log(LOG_NAME, colors.yellow('html comment.'));
		let rules = this.rules;
		if (rules) {
			try {
				_.forEach(rules, function (pair) {
					let pattern = pair['pattern'];
					let regexp = new RegExp(pattern, 'g');
					// don't use regex.test(res).
					// @see http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
					// console.log(res);

					if (pattern && res.match(regexp)) {
						res = res.replace(regexp, pair['replacement']);
					}
				});

			} catch (err) {
				console.log(err);
			}
		}
		return res;
	}

	detect(file) {
		return needFilterFileExts.indexOf(path.extname(file)) >= 0;
	}
}

module.exports = HtmlCommenter;