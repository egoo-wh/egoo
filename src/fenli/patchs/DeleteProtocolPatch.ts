import * as path from 'path'
import { Transform } from 'readable-stream';
import { Patch, PatchInfo } from "../../core/patch";

// html标签，即处理src、href属性？
// src属性(https://www.w3schools.com/tags/att_href.asp) img,audio,video,script,iframe,source...
// href属性(https://www.w3schools.com/tags/att_href.asp) a,link,area,base
// css样式，即处理url()结构？
const HTML_TAG_HTTP_REG = /((src|href)\s*\=\s*['"])http(s)?\:/g
const CSS_URL_HTTP_REG = /(url\(\s*['"]?)http(s)?\:/g;

export default class DeleteProtocolPatch extends Patch {
  // TODO: 遇到http时，是否发出警告。因为可能有强制https的要求。
  private warningWhenNotHttps: boolean = false;

  constructor() {
    super('DeleteProtocolPatch')
  }

  setWaringWhenNotHttps(v) {
    this.warningWhenNotHttps = v;
  }

  async prepare(): Promise<any> {
    return Promise.resolve()
  }

  detect(file: string): boolean {
    const ext = path.extname(file);
    return ['.html', '.shtml', '.htm', '.inc', '.css'].indexOf(ext) >= 0;
  }

  run(info: PatchInfo) {
    const ext = path.extname(info.src);
    const isCssFile = ['.css'].indexOf(ext) >= 0;
    // return this._stream(isCssFile);
    return this._replace(isCssFile)
  }
  _replace(isCssFile) {
    var self = this
    return (line: string) : string => {
      let chunk = line;
      if (isCssFile) {
        chunk = self.deleteProtocolInStyle(chunk)
      } else {
        chunk = self.deleteProtocolInStyle(chunk)
        chunk = self.deleteProtocolInHTMLTag(chunk)
      }
      return chunk;
    }
  }
  _stream(isCssFile) {
    var self = this
    return new Transform({
      transform: function (chunk, enc, callback) {
        if (isCssFile) {
          chunk = self.deleteProtocolInStyle(chunk)
        } else {
          chunk = self.deleteProtocolInStyle(chunk)
          chunk = self.deleteProtocolInHTMLTag(chunk)
        }

        this.push(chunk)

        callback();
      }
    })
  }

  deleteProtocolInStyle(chunk) {
    chunk = chunk.replace(CSS_URL_HTTP_REG, (match) => {
      if (this.warningWhenNotHttps) {
        if (match.search('http') >= 0) {
          throw new Error(`强制Https时发现HTTP，请检查。`)
        }
        return match;
      } else {
        return match ? match.replace(/http(s)?\:/, '') : match;
      }
      
    })
    return chunk
  }

  deleteProtocolInHTMLTag(chunk){
    chunk = chunk.replace(HTML_TAG_HTTP_REG, (match) => {
      if (this.warningWhenNotHttps) {
        if (match.search('http') >= 0) {
          throw new Error(`强制Https时发现HTTP，请检查。`)
        }
        return match;
      } else {
        return match ? match.replace(/http(s)?\:/, '') : match
      }
    })
    return chunk
  }
}