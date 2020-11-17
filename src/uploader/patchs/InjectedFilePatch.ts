import * as path from 'path'
import { ConfCenter } from '../../core/ConfCenter';
import { Patch, PatchInfo } from '../../core/patch';

export default class InjectedFilePatch extends Patch {
  constructor() {
    super('InjectedFilePatch')
  }
  detect(file: string): boolean {
    const ext = path.extname(file);
    return ['.html', '.shtml', '.htm'].indexOf(ext) >= 0;
  }
  async prepare() {
    return ConfCenter.getInstance().include('upload_config')
  }

  run(info: PatchInfo): any {
    return this._replace();
  }
  _replace() {
    return (line: string): string => {
      const injectedJsFilePath = ConfCenter.getInstance().get('upload_config', 'injected.jspath');
      const injectedCSP = ConfCenter.getInstance().get('upload_config', 'injected.csp');
      let result;
      if (injectedCSP) {
        result = line.replace('<head>', `<head>\n<meta http-equiv="Content-Security-Policy" content="${injectedCSP}">`)  
      } else {
        result = line;
      }

      if (injectedJsFilePath) {
        result = result.replace('</head>', `<!-- 预览专用js --><script src="${injectedJsFilePath}"></script>\n</head>`)
      }
      
      return result
    }
  }
}