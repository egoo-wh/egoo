import { promises as fs } from "fs";
import path from "path";
import Handler from "../Handler";
import _ from "lodash";
import spritesmith, { type SpritesmithResult } from "spritesmith";
import { AsyncSeriesHook, SyncHook, SyncWaterfallHook, type Hook } from 'tapable';
import { walkFile, cp } from "../utils/asyncs";
import { logger, logMsg } from "../utils";
import FileUtil from "../utils/FileUtil";
import DefaultTemplatePlugin from "./templates/DefaultTemplatePlugin";
import SCSSTemplatePlugin from "./templates/SCSSTemplatePlugin";

const log = logger("Spritesheet");
const PROJECT_SUFFIX = "_spr";

export interface SpriteTemplateTarget {
  image: string,
  css: string
}

export default class Spritesheet extends Handler {
  public source: string;
  
  private template: string;

  // spritesmith options
  private padding: number;
  private algorithm:
    | "top-down"
    | "left-right"
    | "diagonal"
    | "alt-diagonal"
    | "binary-tree";
  private retina: boolean;

  public hooks: { [name: string]: Hook<any, any> } = {};
  private files: string[] = [];

  constructor(source, template, unit_transform_function, padding, algorithm) {
    super();
    // 如果路径以 / 结尾，则去掉末尾的/ 
    if (source.substr(source.length - 1) === '/') {
      source = source.substr(0, source.length - 1);
    }
    this.source = source;
    this.template = template || 'default';
    this.padding = padding;
    this.algorithm = algorithm;

    this.hooks = {
      beforeInit: new AsyncSeriesHook(),
      afterInit: new AsyncSeriesHook(),
      template: new SyncWaterfallHook(['target', 'result']),
      complete: new AsyncSeriesHook(),
      dispose: new AsyncSeriesHook()
    }
    
    if (this.template === 'default') {
      new DefaultTemplatePlugin(this)
    } else if (this.template === 'scss' || this.template === 'sass') {
      new SCSSTemplatePlugin(this, unit_transform_function)
    } else {
      throw new Error(`template: ${this.template} is not found`);
    }
  }

  async run() {
    try {
      await this.init(this.source);
      await this.start();
      log(logMsg("spritesheet success.", "SUCCESS"));
    } catch (error: any) {
      log(logMsg("spritesheet fail.", "ERROR"));
      log(logMsg(error, "ERROR"));
      log(error.stack);
      throw error;
    }
  }

  detectIsImage(file: string) {
    const ext = path.extname(file);
    return [".png", "jpeg", "jpg", "webp"].indexOf(ext) >= 0;
  }

  async init(source) {
    log(logMsg("spritesheet init", "STEP"));
    this.files = [];
    await this.hooks.beforeInit.promise();
    await walkFile(source, async ({ filePath, type }) => {
      if (type === "file" && this.detectIsImage(filePath)) {
        this.files.push(filePath);
      }
    });
    await this.hooks.afterInit.promise();
  }

  async start() {
    log(logMsg(`spritesheet start ${this.source}`, "STEP"));
    if (!this.files || this.files.length <= 0) {
      log(logMsg("no images", "ERROR"));
      return;
    }
    await FileUtil.createFolder(this.source + PROJECT_SUFFIX);
    log(logMsg(`spritesheet create folder ${this.source + PROJECT_SUFFIX}`, "STEP"));
    const target = {
      image: this.source + PROJECT_SUFFIX + "/spr.png",
      css: this.source + PROJECT_SUFFIX + "/spr.css",
    };
    if (this.template === 'scss') {
      target.css = this.source + PROJECT_SUFFIX + "/spr.scss"
    }
    
    return new Promise<void>((resolve, reject) => {
      spritesmith.run(
        {
          src: this.files,
          padding: this.padding,
          algorithm: this.algorithm,
        },
        (err, result) => {
          if (err) {
            throw err;
          }
          const templateResult = (this.hooks.template as SyncHook<[SpriteTemplateTarget, SpritesmithResult], string>).call(target, result)
          if (!templateResult) {
            reject(new Error(`template error ${templateResult}`))
          }
          // 写入图片和样式
          Promise.all([
            fs.writeFile(target.image, result.image, 'binary'),
            fs.writeFile(target.css, templateResult)
          ]).then(() => {
            resolve();
          });
        }
      );
    })
    
  }

  shutdownHandler() {
    log(logMsg("shutdown"));
  }
}
