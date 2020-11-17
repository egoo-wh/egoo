#!/usr/bin/env node

'use strict';

import * as path from 'path';
import * as yargs from 'yargs';
import * as colors from 'ansi-colors';
import Handler from "./Handler";
import CLI from './CLI';
import { setAppRoot } from "./utils";

setAppRoot(path.join(__dirname, '..'))

let handler: Handler;

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
      'local': {
        describe: '上传到内部服务器（192.168.1.11）。等同于--mode local',
        type: 'boolean',
        default: false,
      },
      'mode': {
        describe: '上传的模式，可以是git/web/local，默认为web',
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
      let { source, others, git, local, mode } = argv;
      mode = (mode as string).toLowerCase();
      if (git) {
        mode = 'git'
      } else if (local) {
        mode = 'local'
      }
      let ignores = {};
      for (const key in argv) {
        if (key.indexOf('ignore-') >= 0) {
          ignores[key.replace('ignore-', '')] = argv[key];
        }
      }
      const sources = [source].concat(others)
      const configForceReload = argv['config-forcereload'];
      handler = await CLI.publish(sources, mode, ignores, configForceReload);
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
        alias: 'h',
        describe: '强制HTTPS，分离地址会强制带上https',
        type: 'boolean'
      }
    },
    handler: async (argv) => {
      const { source, others, url, aliases, forcehttps } = argv;
      const sources = [source].concat(others)
      handler = await CLI.fenli(sources, { url, aliases, forcehttps });
    }
  })
  .demandCommand(1, '请指定命令')
  .onFinishCommand((resultValue) => {
    process.exit();
  })
  .fail((msg: string, err: Error) => {
    console.log(msg)
    console.log(err)
  })
  .help()
  .argv;

// catch the uncaught errors that weren't wrapped in a domain or try catch statement
// do not use this in modules, but only in applications, as otherwise we could have multiple of these bound
process.on('uncaughtException', function (err) {
  // handle the error safely
  console.error(err)
  console.log(colors.red(err.toString()))
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
