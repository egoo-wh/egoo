"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const ConfCenter_1 = require("../../core/ConfCenter");
const patch_1 = require("../../core/patch");
const index_1 = require("../../utils/index");
class ReplacementPatch extends patch_1.Patch {
    constructor() {
        super('ReplacementPatch');
    }
    detect(file) {
        const ext = path.extname(file);
        return ['.html', '.shtml', '.htm', '.css', '.js'].indexOf(ext) >= 0;
    }
    async prepare() {
        return ConfCenter_1.ConfCenter.getInstance().include('upload_config');
    }
    run(info) {
        const replacements = ConfCenter_1.ConfCenter.getInstance().get('upload_config', 'replacements');
        if (replacements && Array.isArray(replacements)) {
            const ext = path.extname(info.src);
            return this._replace(replacements, ext);
        }
        else {
            throw new Error('请检查upload_config replacements配置，应该为数组');
        }
    }
    _replace(replacements, ext) {
        return (line) => {
            return replacements.reduce((l, r) => {
                const fileExts = index_1.convertToFileExt(r.ext);
                if (fileExts.indexOf(ext) >= 0 && r.rules && r.rules.length > 0) {
                    return r.rules.reduce((v, rule) => {
                        try {
                            let pattern = rule['pattern'];
                            if (pattern) {
                                let regexp = new RegExp(pattern, 'g');
                                // don't use regex.test(res).
                                // @see http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
                                v = v.replace(regexp, rule.replace);
                            }
                        }
                        catch (error) {
                            throw error;
                        }
                        return v;
                    }, l);
                }
                return l;
            }, line);
        };
    }
}
exports.default = ReplacementPatch;
