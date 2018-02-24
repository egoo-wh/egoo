'use strict';

let gutil = require('gulp-util');

module.exports = function log() {
	let data = Array.prototype.slice.call(arguments);
	gutil.log.apply(false, data);
}