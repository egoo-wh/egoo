#!/usr/bin/env node

'use strict';

import { createRequire } from 'module'
import path from 'path';
import yargs from 'yargs';
import colors from 'ansi-colors';
import Handler from "./Handler";
import { setAppRoot } from "./utils";
import Fenli from './fenli/Fenli'
import Uploader from './uploader/Uploader';
import Docx2Html from './docx2html';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url)
const pkg = require('../package.json')

const __dirname = path.dirname(fileURLToPath(import.meta.url))
console.log(__dirname);
setAppRoot(path.join(__dirname, '..'))

let handler: Handler;

yargs
  .scriptName('egoo')
  .version(pkg.version)
  .alias('version', 'v')
  /*
  publish
  */
  .command({
    command: 'publish <source> [others...]',
    aliases: ['pub'],
    describe: '上传文件到服务器',
    builder: {
      // 'git': {
      //   describe: '上传到Gitee Pages。等同于--mode git',
      //   type: 'boolean',
      //   default: false,
      // },
      // 'local': {
      //   describe: '上传到内部服务器（192.168.1.11）。等同于--mode local',
      //   type: 'boolean',
      //   default: false,
      // },
      'top': {
        describe: '等同于--mode egoo',
        type: 'boolean',
        default: false,
      },
      'egoo': {
        alias: 'e',
        describe: '上传到egoodev.top。等同于--mode egoo',
        type: 'boolean',
        default: false,
      },
      'pinna': {
        alias: 'p',
        describe: '上传到pinnadev.top。等同于--mode pinna --ignore-injected --ignore-replaced',
        type: 'boolean',
        default: false,
      },
      'mode': {
        describe: '上传的模式，可以是top/pinna，默认为top，上传到egoodev.top',
        type: 'string',
        default: 'egoo'
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
      let { source, others, top, egoo, pinna, mode } = argv;
      mode = (mode as string).toLowerCase();
      if (top || egoo) {
        mode = 'egoo';
      } else if (pinna) {
        mode = 'pinna'
      }
      let ignores = {};
      for (const key in argv) {
        if (key.indexOf('ignore-') >= 0) {
          ignores[key.replace('ignore-', '')] = argv[key];
        }
      }
      const sources = [source as string].concat(others as string[])
      const configForceReload = argv['config-forcereload'];
      const uploader: Uploader = new Uploader();
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
      const sources = [source as string].concat(others as string[])
      let forceHttps: boolean = forcehttps as boolean;
      if (aliases && (aliases as string).toLowerCase() == 'dnf') {
        forceHttps = true;
      }
      const fl = new Fenli(sources, forceHttps);
      handler = fl;
      await fl.run(aliases, url);
    }
  })
  .command({
    command: 'docx2html <source>',
    describe: 'docx转换成html',
    builder: {
      'output': {
        alias: 'o',
        type: 'string'
      }
    },
    handler: async (argv) => {
      const { source, output } = argv;
      const docx2html = new Docx2Html(source, output);
      handler = docx2html;
      await docx2html.run();
    }
  })
  .demandCommand(1, '请指定命令')
  .onFinishCommand((resultValue) => {
    process.exit();
  })
  .fail((msg: string, err: Error) => {
    console.error(err)
    if (handler) {
      console.log('shutdown');
      handler.emit('shutdown');
    };
    process.exit(1);
  })
  .help()
  .argv;

// catch the uncaught errors that weren't wrapped in a domain or try catch statement
// do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
process.on('uncaughtException', function (err) {
  // handle the error safely
  console.error(err)
  console.log(colors.red(err.toString()))
  if (handler) {
    console.log('shutdown');
    handler.emit('shutdown');
  };
})
// shutdown.  ctrl-c强制退出
process.on("SIGINT", function () {
  //graceful shutdown
  if (handler) {
    console.log('shutdown');
    handler.emit('shutdown');
  };

  process.exit();
});
