"use strict";
/**
 * https://github.com/ustbhuangyi/better-scroll/blob/master/packages/shared-utils/src/events.ts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EventEmitter = void 0;
class EventEmitter {
    constructor(names) {
        this.events = {};
        this.eventTypes = {};
        this.registerType(names);
    }
    on(type, fn, context = this) {
        this.hasType(type);
        if (!this.events[type]) {
            this.events[type] = [];
        }
        this.events[type].push([fn, context]);
        return this;
    }
    once(type, fn, context = this) {
        this.hasType(type);
        const magic = (...args) => {
            this.off(type, magic);
            fn.apply(context, args);
        };
        magic.fn = fn;
        this.on(type, magic);
        return this;
    }
    off(type, fn) {
        if (!type && !fn) {
            this.events = {};
            return this;
        }
        if (type) {
            this.hasType(type);
            if (!fn) {
                this.events[type] = [];
                return this;
            }
            let events = this.events[type];
            if (!events) {
                return this;
            }
            let count = events.length;
            while (count--) {
                if (events[count][0] === fn ||
                    (events[count][0] && events[count][0].fn === fn)) {
                    events.splice(count, 1);
                }
            }
            return this;
        }
    }
    trigger(type, ...args) {
        this.hasType(type);
        let events = this.events[type];
        if (!events) {
            return;
        }
        let len = events.length;
        let eventsCopy = [...events];
        let ret;
        for (let i = 0; i < len; i++) {
            let event = eventsCopy[i];
            let [fn, context] = event;
            if (fn) {
                ret = fn.apply(context, args);
                if (ret === true) {
                    return ret;
                }
            }
        }
    }
    registerType(names) {
        names.forEach((type) => {
            this.eventTypes[type] = type;
        });
    }
    destroy() {
        this.events = {};
        this.eventTypes = {};
    }
    hasType(type) {
        const types = this.eventTypes;
        const isType = types[type] === type;
        if (!isType) {
            console.warn(`EventEmitter has used unknown event type: "${type}", should be oneof [` +
                `${Object.keys(types).map(_ => JSON.stringify(_))}` +
                `]`);
        }
    }
}
exports.EventEmitter = EventEmitter;
