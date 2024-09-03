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
    let tpl = '@use "sass:map";\n'
    // 注入每个图片，一个大的Map，然后从中取值。
    tpl += `
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
    @mixin spritesheet($name) {
      $spr-width: map.get($${this.prefix}, $name, "width");
      $spr-height: map.get($${this.prefix}, $name, "height");
      $spr-image: map.get($${this.prefix}, $name, "image");
      $spr-offset-x: map.get($${this.prefix}, $name, "x");
      $spr-offset-y: map.get($${this.prefix}, $name, "y");
      width: ${this.transformUnit('$spr-width')};
      height: ${this.transformUnit('$spr-height')};
      background-image: url("#{$spr-image}");
      background-position: ${this.transformUnit('$spr-offset-x')} ${this.transformUnit('$spr-offset-y')};
      background-size: ${this.transformUnit(`${properties.width}px`)} ${this.transformUnit(`${properties.height}px`)};
    }
    `

    // test
    tpl += `
    .arrow {
      @include spritesheet('arrow')
    }`

    tpl = beautify.css(tpl, { end_with_newline: true, indent_size: 2 });
    return tpl
  }
}