"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const readable_stream_1 = require("readable-stream");
const patch_1 = require("../../core/patch");
// html标签，即处理src、href属性？
// src属性(https://www.w3schools.com/tags/att_href.asp) img,audio,video,script,iframe,source...
// href属性(https://www.w3schools.com/tags/att_href.asp) a,link,area,base
// css样式，即处理url()结构？
const HTML_TAG_HTTP_REG = /((src|href)\s*\=\s*['"])http(s)?\:/g;
const CSS_URL_HTTP_REG = /(url\(\s*['"]?)http(s)?\:/g;
class DeleteProtocolPatch extends patch_1.Patch {
    constructor() {
        super('DeleteProtocolPatch');
        // TODO: 遇到http时，是否发出警告。因为可能有强制https的要求。
        this.warningWhenNotHttps = false;
    }
    setWaringWhenNotHttps(v) {
        this.warningWhenNotHttps = v;
    }
    async prepare() {
        return Promise.resolve();
    }
    detect(file) {
        const ext = path.extname(file);
        return ['.html', '.shtml', '.htm', '.inc', '.css'].indexOf(ext) >= 0;
    }
    run(info) {
        const ext = path.extname(info.src);
        const isCssFile = ['.css'].indexOf(ext) >= 0;
        // return this._stream(isCssFile);
        return this._replace(isCssFile);
    }
    _replace(isCssFile) {
        var self = this;
        return (line) => {
            let chunk = line;
            if (isCssFile) {
                chunk = self.deleteProtocolInStyle(chunk);
            }
            else {
                chunk = self.deleteProtocolInStyle(chunk);
                chunk = self.deleteProtocolInHTMLTag(chunk);
            }
            return chunk;
        };
    }
    _stream(isCssFile) {
        var self = this;
        return new readable_stream_1.Transform({
            transform: function (chunk, enc, callback) {
                if (isCssFile) {
                    chunk = self.deleteProtocolInStyle(chunk);
                }
                else {
                    chunk = self.deleteProtocolInStyle(chunk);
                    chunk = self.deleteProtocolInHTMLTag(chunk);
                }
                this.push(chunk);
                callback();
            }
        });
    }
    deleteProtocolInStyle(chunk) {
        if (this.warningWhenNotHttps) {
            this.warningWhenFindHttp(chunk);
            return chunk;
        }
        else {
            chunk = chunk.replace(CSS_URL_HTTP_REG, (match) => {
                return match ? match.replace(/http(s)?\:/, '') : match;
            });
            return chunk;
        }
    }
    deleteProtocolInHTMLTag(chunk) {
        if (this.warningWhenNotHttps) {
            this.warningWhenFindHttp(chunk);
            return chunk;
        }
        else {
            chunk = chunk.replace(HTML_TAG_HTTP_REG, (match) => {
                return match ? match.replace(/http(s)?\:/, '') : match;
            });
        }
        return chunk;
    }
    warningWhenFindHttp(chunk) {
        const matches = chunk.match(HTML_TAG_HTTP_REG);
        const match = matches ? matches[0] : '';
        if (match && match.search('http:') >= 0) {
            throw new Error(`强制https时发现http，请检查 ${chunk} 后重新分离。`);
        }
    }
}
exports.default = DeleteProtocolPatch;
