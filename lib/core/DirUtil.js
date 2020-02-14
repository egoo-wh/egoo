'use strict';

let path = require('path');
let fs  = require('fs');
let util = require('util');
let _ = require('lodash');

let DirUtil = module.exports = {};

const fslstat = util.promisify(fs.lstat);
const fsreaddir = util.promisify(fs.readdir);

// https://github.com/then/is-promise
const isPromise = (obj) => {
	return !!obj && (typeof obj === 'object' || typeof obj === 'function') && typeof obj.then === 'function';
}
/**
 * Checks whether a path starts with or contains a hidden file or a folder.
 * @param {string} source - The path of the file that needs to be validated.
 * returns {boolean} - `true` if the source is blacklisted and otherwise `false`.
 */
let isUnixHiddenPath = function (path) {
    return (/(^|\/)\.[^\/\.]/g).test(path);
};

/**
 * [description]
 * @param  {[type]} src     [description]
 * @param  {[type]} handler ({filePath, type}) => {}
 * @return {[type]}         [description]
 */
DirUtil.walkFile = (src, handler) => {
	return fslstat(src).then((stats)=>{
		if (stats.isDirectory()) {
			handler && handler.call(null, {filePath: src, type:"dir"});
			return fsreaddir(src).then((files)=>{
				let all = _.chain(files).map((file)=>{
					if (!isUnixHiddenPath(file)) {
						return DirUtil.walkFile(path.join(src, file), handler);	
					}
				});
				return Promise.all(all);
			})
		} else {
			let handlerReturn = handler && handler.call(null, {filePath: src, type:"file"});
			return isPromise(handlerReturn) ? handlerReturn : Promise.resolve(handlerReturn);
		}
	}).catch((err)=>{
		console.log(err);
	})
}
