// 处理器基类

'use strict';

let EventEmitter 	= require('events').EventEmitter;

class Handler extends EventEmitter {
	constructor() {
		super();
		this.on('shutdown', this.shutdownHandler);
	}

	shutdownHandler() {
		
	}
}

module.exports = Handler;