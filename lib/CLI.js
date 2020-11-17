"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const Fenli_1 = tslib_1.__importDefault(require("./fenli/Fenli"));
const Uploader_1 = tslib_1.__importDefault(require("./uploader/Uploader"));
const publish = async function (sources, mode, ignores, configForceReload) {
    const uploader = new Uploader_1.default();
    await uploader.run(sources, mode, ignores, configForceReload);
    return uploader;
};
const fenli = async function (sources, options) {
    let { aliases, url, forcehttps: forceHttps = false } = options;
    if (aliases.toLowerCase() == 'dnf') {
        forceHttps = true;
    }
    const fl = new Fenli_1.default(sources, forceHttps);
    await fl.run(aliases, url);
    return fl;
};
exports.default = {
    publish,
    fenli
};
