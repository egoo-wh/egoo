import * as path from 'path'
import { ConfCenter } from '../../core/ConfCenter';
import { Patch, PatchInfo } from '../../core/patch'
import { convertToFileExt } from '../../utils/index'

export default class ReplacementPatch extends Patch {
  constructor(){
    super('ReplacementPatch')
  }

  detect(file: string): boolean {
    const ext = path.extname(file);
    return ['.html', '.shtml', '.htm', '.css', '.js'].indexOf(ext) >= 0;
  }

  async prepare() {
    return ConfCenter.getInstance().include('upload_config')
  }

  run(info: PatchInfo) {
    const replacements = ConfCenter.getInstance().get('upload_config', 'replacements');
    if (replacements && Array.isArray(replacements)) {
      const ext = path.extname(info.src);
      return this._replace(replacements, ext);
    } else {
      throw new Error('请检查upload_config replacements配置，应该为数组')
    }
  }
  _replace(replacements, ext: string) {
    return (line: string): string => {
      return replacements.reduce((l, r) => {
        const fileExts = convertToFileExt(r.ext);
        if (fileExts.indexOf(ext) >= 0 && r.rules && r.rules.length > 0) {
          return r.rules.reduce((v, rule) => {
            try {
              let pattern = rule['pattern'];
              if (pattern) {
                let regexp = new RegExp(pattern, 'g');
                // don't use regex.test(res).
                // @see http://stackoverflow.com/questions/1520800/why-regexp-with-global-flag-in-javascript-give-wrong-results
                v = v.replace(regexp, rule.replace)
              }
            } catch (error) {
              throw error;
            }
            return v;
          }, l);
        }
        return l;
      }, line)
    }
  }
}