// 图片尺寸偶数化
// 因为京东规范要求**图片尺寸严禁使用奇数值**，故创建本工具。
// @see https://jdc.jd.com/cp/#1-尺寸-单位
// 
// 实现方式：
// PNG图片，增加透明边
// JPG图片，拉伸至偶数尺寸
// 
// https://github.com/lovell/sharp (不能覆盖原文件，弃用)
// https://github.com/aheckmann/gm

let path = require('path');
let DirUtil = require('../utils/DirUtil.js');
let Handler = require('../Handler');
let gm = require('gm');
let gutil = require('gulp-util');
let util = require('util');
let {log} = require('../utils');

const LOG_NAME = 'ImgSizeEvenify';

class ImgSizeEvenify extends Handler {
	constructor(source) {
		super();
		this.source = source;

		this.run(source);
	}

	run(source) {
		DirUtil.walkFile(source, ({filePath, type}) => {
			return this.shouldResize(filePath).then((size)=>{
				if (size) {
					return this.resize(filePath, size);
				} else {
					return Promise.resolve();
				}
			})
		})
	}

	resize(file, size) {
		return new Promise((resolve, reject)=>{
			let nw = size.width, nh = size.height;
			if (nw%2!==0) {nw=Math.ceil(nw/2)*2;}
			if (nh%2!==0) {nh=Math.ceil(nh/2)*2;}
			gm(file).resizeExact(nw,nh).write(file, (err)=>{
				if (err) { reject(err); }
				else { 
					log(LOG_NAME, 'resize '+gutil.colors.cyan(path.relative(this.source, file))+' from '+(size.width+'x'+size.height)+gutil.colors.cyan(' to ')+gutil.colors.green(nw+'x'+nh)+'.');
					resolve(); 
				}
			});
		});
	}

	shouldResize(file) {
		if (['.jpg', '.png'].indexOf(path.extname(file)) >= 0) {
			return new Promise((resolve, reject)=>{
				gm(file).size((err, size)=>{
					if (err) { reject(err); }
					else {
						if (size.width%2!==0||size.height%2!==0) {

							resolve(size);
						}else {
							resolve(null);
						}
					}
				})	
			})
		} else {
			return Promise.resolve(null);
		}
		
	}

	shutdownHandler() {
		
	}
}


module.exports = ImgSizeEvenify;