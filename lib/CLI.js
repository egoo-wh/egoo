'use strict';

let path = require('path');
let Uploader = require('./uploader/Uploader');
let ImgSizeEvenify = require('./imgeven/ImgSizeEvenify');
let TinyPNG = require('./tinypng/TinyPNG');
let Fenli = require('./fenli/Fenli');
let GitUploader = require('./GitUploader/GitUploader');

let CLI = module.exports = {};

CLI.publish = function(localPath, remotePath, isRemoteServer, noCache) {
	return new Uploader(localPath, remotePath, isRemoteServer, noCache);
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

CLI.gitPub = function(localPath) {
	return new GitUploader(localPath);
}

CLI.build = function(source, dest, plugins, options) {
	return new Builder(source, dest, plugins, options);
}

