'use strict';

let fs 				= require('fs');
let _ 				= require('lodash');

let DirectoryUtil = module.exports = {};

/**
 * [walkFileTree description]
 * @param  {[type]} srcDir            [description]
 * @param  {[type]} destDir           [description]
 * @param  {[type]} fileHandler       处理函数。可以是Promise。
 * @return {[type]}                   [description]
 */
DirectoryUtil.walkFileTree = function(src, fileHandler) {
	return new Promise((resolve, reject)=>{
		return new Promise((resolve, reject)=>{
			fs.lstat(src, (err, stats) => {
				if (err) { reject(err); }
				else { resolve(stats); }
			})
		}).then((stats)=>{
			if (stats.isDirectory()) {
				return new Promise((resolve, reject)=>{
					fs.readdir(srcDir, (err, fileNames) => {
						if (err) { reject(err); }
						else { resolve(fileNames); }
					})
				})
			}else {
				return [src];
			}
		});
	}).then((fileNames)=>{
		let files = _.map(fileNames, fileName => srcDir+'/'+fileName);
		let all = _.chain(files)
		.map((file, i)=>{
			return new Promise(function(resolve, reject){
				fs.lstat(file, function(err, stat){
					if (err) { reject(err); }
					else{ resolve([fileNames[i], stat.isDirectory()]); }
				})
			}).then(function(result){
				return result;
			})
		})
		.value();

		return Promise.all(all)
		.then(function(result){
			let all = _.chain(result)
			.map((item) => {
				let fileName = item[0];
				let fileStatIsDirectory = item[1];

				// let fileHandlerReturn = fileHandler && fileHandler.apply(null, [srcDir, fileName, fileStatIsDirectory]);

				let fileHandlerReturn = fileHandler && fileHandler.apply(null, [srcDir, destDir, fileName, fileStatIsDirectory]);
				let p = Promise.resolve(fileHandlerReturn);

				if (fileStatIsDirectory) {
					return p.then(function(){
						return DirectoryUtil.walkFileTree(srcDir+'/'+fileName, destDir+'/'+fileName, fileHandler);
					});
				}else {
					return p;
				}
			})
			.value();

			return Promise.all(all);
		})
	})
}

DirectoryUtil.walkFileTreeSync = function (srcDir, destDir, query, temp, hashAssets) {
	let files = fs.readdirSync(srcDir);
	for (let i = 0; i < files.length; i++) {
		let fileName = files[i];
		let localpath = srcDir+'/'+fileName;
		let remotepath = destDir+'/'+fileName;
		let fileStatIsDirectory = fs.lstatSync(localpath).isDirectory(); 

		fileHandler && fileHandler.apply(null, [srcDir, destDir, fileName, fileStatIsDirectory].concat(fileHandlerParams));

		if (fileStatIsDirectory) {
			return walkFileTreeSync(localpath, remotepath, query, temp, hashAssets);
		}
	};
}