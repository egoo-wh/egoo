let path = require('path');
let log = require('fancy-log');
let colors = require('ansi-colors');
let _ = require('lodash');
let prompt = require('prompt');

// 配置文件基准地址
const CONFIG_URL = 'http://cli.egooidea.com/';
// const CONFIG_URL = 'https://raw.githubusercontent.com/egoo-wh/egoo/master/conf/';
// const CONFIG_URL = 'http://192.168.1.11/static/';
// colors 使用规范
// 表示文件路径 -> cyan
// 表示命令行提示 -> red
// 表示操作中的重点语句 -> blue
// 表示一个步骤 -> yellow

/**
 * 打印
 * @return {[type]} [description]
 */
// function log() {
// 	let data = Array.prototype.slice.call(arguments);
// 	fancylog.apply(false, data);
// }
/**
 * 用于服务器端连接路径。linux服务器用/连接
 * @param  {...[type]} paths [description]
 * @return {[type]}          [description]
 */
function serverPathJoin(...paths) {
	return _.reduce(paths, (v, p)=>{
		let s = '';
		if (_.isString(p)) {
			s = p;
		} else if (_.isArray(p)) {
			s = p.join('/');
		} else {
			s = p.toString();
		}
		return v?v+'/'+s:s;
	}, '');
	// return paths.join('/');
}
/**
 * “Promise化”sftp的方法调用
 * @param  {Function} fn                  [description]
 * @param  {[type]}   ctx                 [description]
 * @param  {Boolean}  isErrorResolveFalse [description]
 * @param  {[type]}   args                [description]
 * @return {[type]}                       [description]
 */
function sfcall(fn, ctx, isErrorResolveFalse, ...fnArgs) {
	if (!fn) { 
		throw new Error("can't find function for sfcall.");
	};
	return new Promise((resolve, reject) => {
		function fnCallback(err) {
			if (isErrorResolveFalse) {
				if (err) { resolve(false); }
				else { resolve(true); }
			} else {
				if (err) { reject(err); }
				else { resolve(); }	
			}
		}
		try {
			fn.apply(ctx, fnArgs.concat(fnCallback));
		}catch(err) {
			reject(err);
		}
	})
}

/**
 * 显示命令行提示
 * @param  {[type]} props Array[String/{name,message}]
 * @return {[type]}       [description]
 */
function showPrompt(props) {
	return new Promise((resolve, reject)=>{
		let p = _.reduce(props, (result, value)=>{
			if (_.isString(value)) {
				result[value] = {message: colors.yellow(value)+":", required: true};	
			} else if (_.isPlainObject(value)) {
				result[value['name']] = {message: colors.yellow(value['message']+":"), required: true};
			}
			return result;
		}, {});
	 
	 	prompt.message = colors.yellow('请输入')
	 	prompt.delimiter = '';
	  
	  prompt.start();
	 
	  prompt.get({ properties: p }, function (err, result) {
	  	if (err) { reject(err)}
  		else {
		    resolve(result);
  		}
	  });
	})
}

/**
 * 单位转换
 * @param  {[type]} num [description]
 * @return {[type]}     [description]
 */
function bytesSizeFormat(num) {
	let KB = 1000;
	let MB = Math.pow(KB, 2);
	let GB = Math.pow(KB, 3);
	if (num < KB) {
		return num + '字节';
	} else if (KB <= num < MB) {
		return Math.floor(num/KB)+"KB";
	} else if (MB <= num < GB) {
		return Math.floor(num/MB)+"MB";
	} else {
		return Math.floor(num/GB)+"GB";
	}
}


function getConfigURL(configFileName) {
	return CONFIG_URL + configFileName;
}
function getLocalURL(configFileName) {
	return path.join(global.rootPath, 'data', configFileName);
}


function isRelativePath(p) {
	return !/^((http(s)?|ftp|):)?\/\//i.test(p) && !/^(data:image)/i.test(p) && !/^(data:application)/i.test(p) && !path.isAbsolute(p);
}

function isHttpPath(p) {
	return /^(http(s)?:)?\/\//i.test(p);
}

module.exports = {log, serverPathJoin, sfcall, showPrompt, bytesSizeFormat, getConfigURL, getLocalURL, isRelativePath, isHttpPath};