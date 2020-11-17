"use strict";
// 处理器基类
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
class Handler extends events_1.EventEmitter {
    constructor() {
        super();
        this.on('shutdown', this.shutdownHandler);
    }
}
exports.default = Handler;
