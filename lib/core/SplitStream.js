"use strict";
// https://github.com/mcollina/split2/blob/master/index.js
Object.defineProperty(exports, "__esModule", { value: true });
const readable_stream_1 = require("readable-stream");
function split(matcher, mapper, options) {
    function noop(incoming) {
        return incoming;
    }
    // Set defaults for any arguments not supplied.
    matcher = matcher || /(\r?\n)/;
    mapper = mapper || noop;
    options = options || {};
    // Test arguments explicitly.
    switch (arguments.length) {
        case 1:
            // If mapper is only argument.
            if (typeof matcher === 'function') {
                mapper = matcher;
                matcher = /(\r?\n)/;
                // If options is only argument.
            }
            else if (typeof matcher === 'object' && !(matcher instanceof RegExp)) {
                options = matcher;
                matcher = /(\r?\n)/;
            }
            break;
        case 2:
            // If mapper and options are arguments.
            if (typeof matcher === 'function') {
                options = mapper;
                mapper = matcher;
                matcher = /(\r?\n)/;
                // If matcher and options are arguments.
            }
            else if (typeof mapper === 'object') {
                options = mapper;
                mapper = noop;
            }
    }
    let kLast = '';
    // let kDecoder = new StringDecoder('utf8')
    function transform(chunk, enc, cb) {
        var list;
        // kLast += kDecoder.write(chunk)
        kLast += chunk;
        list = kLast.split(matcher);
        kLast = list.pop();
        for (var i = 0; i < list.length; i++) {
            try {
                this.push(mapper(list[i]));
            }
            catch (error) {
                return cb(error);
            }
        }
        cb();
    }
    function flush(cb) {
        // forward any gibberish left in there
        // this[kLast] += this[kDecoder].end()
        if (kLast) {
            try {
                this.push(mapper(kLast));
            }
            catch (error) {
                return cb(error);
            }
        }
        cb();
    }
    options = Object.assign({}, options);
    options.transform = transform;
    options.flush = flush;
    options.readableObjectMode = true;
    return new readable_stream_1.Transform(options);
}
exports.default = split;
