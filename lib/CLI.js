'use strict';

let path = require('path');
let log = require('fancy-log');
let colors = require('ansi-colors');
let Uploader = require('./uploader/Uploader');
let ImgSizeEvenify = require('./imgeven/ImgSizeEvenify');
let TinyPNG = require('./tinypng/TinyPNG');
let Fenli = require('./fenli/Fenli');
let GitUploader = require('./uploader/GitUploader');
let UserConf = require('./core/UserConf');

let CLI = module.exports = {};

CLI.publish = function(localPath, options) {
	let { 
		git = false, 
		remotepath: remotePath = null, 
		nocache: noCache = false, 
		nofilter: noFilter = false, 
		configpath: serverConfigPath 
	} = options;
	let uploader;
	let shtmlReplaced = false;
	if (git) {
		noFilter = true
		uploader = new GitUploader(localPath, remotePath);
		shtmlReplaced = true;
	} else {
		uploader = new Uploader(localPath, remotePath);
	}
	uploader.run(serverConfigPath, noCache, noFilter, shtmlReplaced).then(() => {
		log(colors.green('publish success.'));

		if (!this.isFile) {
			log('preview url: ', colors.underline(
				uploader.previewUrl + path.basename(uploader.localPath) + '/' + (uploader.indexFileName || '')
			));
		}
	});
	return uploader;
}

CLI.imgEven = function(source) {
	return new ImgSizeEvenify(source);
}

CLI.tinypng = function(source) {
	return new TinyPNG(source);
}

CLI.fenli = function(source, aliases, url) {
	return new Fenli(source, aliases, url);
}

CLI.build = function(source, dest, plugins, options) {
	return new Builder(source, dest, plugins, options);
}

