// 处理器基类

import { EventEmitter } from 'events'

export default abstract class Handler extends EventEmitter {
  constructor() {
    super();
    this.on('shutdown', this.shutdownHandler);
  }

  abstract shutdownHandler(): void;
}