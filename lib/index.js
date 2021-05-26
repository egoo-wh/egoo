#!/usr/bin/env node
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const path = tslib_1.__importStar(require("path"));
const yargs = tslib_1.__importStar(require("yargs"));
const colors = tslib_1.__importStar(require("ansi-colors"));
const utils_1 = require("./utils");
const Fenli_1 = tslib_1.__importDefault(require("./fenli/Fenli"));
const Uploader_1 = tslib_1.__importDefault(require("./uploader/Uploader"));
utils_1.setAppRoot(path.join(__dirname, '..'));
let handler;
yargs
    .scriptName('egoo')
    .version()
    .alias('version', 'v')
    /*
    publish
    */
    .command({
    command: 'publish <source> [others...]',
    aliases: ['pub'],
    describe: '上传文件到服务器',
    builder: {
        'git': {
            describe: '上传到Gitee Pages。等同于--mode git',
            type: 'boolean',
            default: false,
        },
        'top': {
            describe: '上传到egoodev.top。等同于--mode top',
            type: 'boolean',
            default: false,
        },
        'local': {
            describe: '上传到内部服务器（192.168.1.11）。等同于--mode local',
            type: 'boolean',
            default: false,
        },
        'mode': {
            describe: '上传的模式，可以是top/git/web/local，默认为web，上传到egoodev.cn',
            type: 'string',
            default: 'web'
        },
        'ignore-cache': {
            describe: '忽略缓存，全量上传',
            type: 'boolean',
            default: false
        },
        'ignore-injected': {
            describe: '忽略文件注入',
            type: 'boolean',
            default: false
        },
        'ignore-replaced': {
            describe: '忽略文本替换',
            type: 'boolean',
            default: false
        },
        'config-forcereload': {
            describe: '重新加载配置文件',
            type: 'boolean',
            default: false
        }
    },
    handler: async (argv) => {
        let { source, others, git, top, local, mode } = argv;
        mode = mode.toLowerCase();
        if (git) {
            mode = 'git';
        }
        else if (local) {
            mode = 'local';
        }
        else if (top) {
            mode = 'top';
        }
        let ignores = {};
        for (const key in argv) {
            if (key.indexOf('ignore-') >= 0) {
                ignores[key.replace('ignore-', '')] = argv[key];
            }
        }
        const sources = [source].concat(others);
        const configForceReload = argv['config-forcereload'];
        const uploader = new Uploader_1.default();
        handler = uploader;
        await uploader.run(sources, mode, ignores, configForceReload);
    }
})
    /*
    fenli
    */
    .command({
    command: 'fenli <source> [others...]',
    describe: '分离',
    builder: {
        'url': {
            alias: 'u',
            describe: '指定分离路径。如（//game.gtimg.cn/images/dnf/cp/）',
            type: 'string',
        },
        'aliases': {
            alias: 'a',
            describe: '项目所属游戏的别名，根据游戏找到对应分离路径。如地下城与勇士为dnf，QQ飞车为speed，王者荣耀为pvp。更多信息请查看https://fenli.egooidea.com',
            type: 'string'
        },
        'forcehttps': {
            describe: '强制https，会在分离地址前加上https:，同时，http: 地址会发出错误提示',
            type: 'boolean'
        }
    },
    handler: async (argv) => {
        const { source, others, url, aliases, forcehttps } = argv;
        const sources = [source].concat(others);
        let forceHttps = forcehttps;
        if (aliases && aliases.toLowerCase() == 'dnf') {
            forceHttps = true;
        }
        const fl = new Fenli_1.default(sources, forceHttps);
        handler = fl;
        await fl.run(aliases, url);
    }
})
    .demandCommand(1, '请指定命令')
    .onFinishCommand((resultValue) => {
    process.exit();
})
    .fail((msg, err) => {
    if (handler) {
        console.log('shutdown');
        handler.emit('shutdown');
    }
    ;
    process.exit(1);
})
    .help()
    .argv;
// catch the uncaught errors that weren't wrapped in a domain or try catch statement
// do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
process.on('uncaughtException', function (err) {
    // handle the error safely
    console.error(err);
    console.log(colors.red(err.toString()));
    if (handler) {
        console.log('shutdown');
        handler.emit('shutdown');
    }
    ;
});
// shutdown.  ctrl-c强制退出
process.on("SIGINT", function () {
    //graceful shutdown
    if (handler) {
        console.log('shutdown');
        handler.emit('shutdown');
    }
    ;
    process.exit();
});
