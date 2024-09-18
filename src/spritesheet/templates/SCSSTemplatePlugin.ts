import path from "path";
import beautify from "js-beautify";
import type Spritesheet from "../spritesheet";
import type { SpriteTemplateTarget } from "../spritesheet";
import { type SpritesmithResult } from "spritesmith";
import { logger, logMsg } from '../../utils';

const log = logger('SCSSTemplatePlugin')

/**
 * scss模板
 */
export default class SCSSTemplatePlugin {
  private prefix = 'spr';

  private unitTransformFunction: string;

  constructor(spritesheet: Spritesheet, unit_transform_function: string) {
    this.prefix = `${path.basename(spritesheet.source)}_spr`;
    this.unitTransformFunction = unit_transform_function;
    spritesheet.hooks.template.tap('SCSSTemplatePlugin', (target: SpriteTemplateTarget, result: SpritesmithResult) => {
      log(logMsg("render", "STEP"));
      return this.render(spritesheet, target, result)
    })
  }

  transformUnit(unit) {
    if (this.unitTransformFunction) {
      return this.unitTransformFunction.replace('$$', unit);
    } else {
      return unit
    }
  }

  render(spritesheet: Spritesheet, target: SpriteTemplateTarget, result: SpritesmithResult) {
    const imagePath = path.relative(target.css, target.image);
    const { properties, coordinates } = result;
    const names = Object.keys(coordinates)
    const sourceName = path.basename(spritesheet.source)
    let tpl = '@use "sass:map";\n'
    // 注入每个图片，一个大的Map，然后从中取值。
    tpl += `
    $${this.prefix}_createtime: '${new Date().toLocaleString()}';
    // nested map.
    $${this.prefix}: (
      ${names.map(k => {
        const d = coordinates[k]
        let n = path.relative(spritesheet.source, k);
        n = n.replace(/\.[png|jpeg|jpg|webp]*/, '');
        return `${n}: (
          name: '${n}',
          x: ${d.x}px,
          y: ${d.y}px,
          width: ${d.width}px,
          height: ${d.height}px,
          image: '${imagePath}'
        )`
      }).join(',')}
    );\n`
    // 注入mixins
    tpl += `
    @mixin ${sourceName}-spr($name, $scale: 1) {
      @if map.has-key($${this.prefix}, $name) {
      } @else {
        @error "${sourceName} 中未找到 #{$name}";
      }
      $spr-width: map.get($${this.prefix}, $name, "width");
      $spr-height: map.get($${this.prefix}, $name, "height");
      $spr-image: map.get($${this.prefix}, $name, "image");
      $spr-offset-x: map.get($${this.prefix}, $name, "x") * -1;
      $spr-offset-y: map.get($${this.prefix}, $name, "y") * -1;
      width: ${this.transformUnit('$spr-width')} * $scale;
      height: ${this.transformUnit('$spr-height')} * $scale;
      background-image: url("#{$spr-image}");
      background-position: ${this.transformUnit('$spr-offset-x')} * $scale ${this.transformUnit('$spr-offset-y')} * $scale;
      background-size: ${this.transformUnit(`${properties.width}px`)} * $scale ${this.transformUnit(`${properties.height}px`)} * $scale;
    }
    @mixin ${sourceName}-spr-mask($name, $scale: 1) {
      @if map.has-key($${this.prefix}, $name) {
      } @else {
        @error "${sourceName} 中未找到 #{$name}";
      }
      $spr-width: map.get($${this.prefix}, $name, "width");
      $spr-height: map.get($${this.prefix}, $name, "height");
      $spr-image: map.get($${this.prefix}, $name, "image");
      $spr-offset-x: map.get($${this.prefix}, $name, "x") * -1;
      $spr-offset-y: map.get($${this.prefix}, $name, "y") * -1;
      -webkit-mask-image: url("#{$spr-image}");
      -webkit-mask-position: ${this.transformUnit('$spr-offset-x')} * $scale ${this.transformUnit('$spr-offset-y')} * $scale;
      -webkit-mask-size: ${this.transformUnit(`${properties.width}px`)} * $scale ${this.transformUnit(`${properties.height}px`)} * $scale;
    }
    `;
    

    tpl = beautify.css(tpl, { end_with_newline: true, indent_size: 2 });
    return tpl
  }
}