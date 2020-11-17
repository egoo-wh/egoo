"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const ConfCenter_1 = require("../../core/ConfCenter");
const patch_1 = require("../../core/patch");
class InjectedFilePatch extends patch_1.Patch {
    constructor() {
        super('InjectedFilePatch');
    }
    detect(file) {
        const ext = path.extname(file);
        return ['.html', '.shtml', '.htm'].indexOf(ext) >= 0;
    }
    async prepare() {
        return ConfCenter_1.ConfCenter.getInstance().include('upload_config');
    }
    run(info) {
        return this._replace();
    }
    _replace() {
        return (line) => {
            const injectedJsFilePath = ConfCenter_1.ConfCenter.getInstance().get('upload_config', 'injected.jspath');
            const injectedCSP = ConfCenter_1.ConfCenter.getInstance().get('upload_config', 'injected.csp');
            let result;
            if (injectedCSP) {
                result = line.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${injectedCSP}">`);
            }
            else {
                result = line;
            }
            if (injectedJsFilePath) {
                result = result.replace('</head>', `<!-- 预览专用js --><script src="${injectedJsFilePath}"></script>\n</head>`);
            }
            return result;
        };
    }
}
exports.default = InjectedFilePatch;
