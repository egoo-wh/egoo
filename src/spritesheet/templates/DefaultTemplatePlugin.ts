import path from "path";
import type Spritesheet from "../spritesheet";
import type { SpriteTemplateTarget } from "../spritesheet";
import { type SpritesmithResult } from "spritesmith";
import { logger, logMsg } from '../../utils';

const log = logger('DefaultTemplatePlugin')

/**
 * 默认模板
 * 基础的css模板
 */
export default class DefaultTemplatePlugin {
  constructor(spritesheet: Spritesheet) {
    console.log('DefaultTemplatePlugin')
    spritesheet.hooks.template.tap('DefaultTemplatePlugin', (target: SpriteTemplateTarget, result: SpritesmithResult) => {
      console.log('DefaultTemplatePlugin tap')
      log(logMsg("render", "STEP"));
      return this.render(spritesheet, target, result)
    })
  }

  render(spritesheet: Spritesheet, target: SpriteTemplateTarget, result: SpritesmithResult) {
    const imagePath = path.relative(target.css, target.image);
    const { properties, coordinates } = result;
    let tpl = ''
    tpl += `.spr{background-image: url(${imagePath});background-size: ${properties.width}px ${properties.height}px;}\n`;
    for (let k in coordinates) {
      const d = coordinates[k]
      k = path.relative(spritesheet.source, k);
      k = k.replace(/\.[png|jpeg|jpg|webp]*/, '');
      tpl += `.spr.${k}{background-position: ${d.x}px ${d.y}px;}\n`;
    }
    return tpl
  }
}