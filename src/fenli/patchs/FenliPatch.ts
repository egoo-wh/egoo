import * as path from 'path'
import { Transform } from 'readable-stream';
import { Patch, PatchInfo } from "../../core/patch";

const HTML_ELEMENT_REG = /(<([^>]+)>)/g;
const HTML_TAG_IMG_REG = /<([^>]+)\s*(src|href|poster)(\s*=['"])(\.+\/)*(images|ossweb-img)(.*['"])[^>]*>/g
const CSS_URL_REG = /(url\(\s*['"]?)([^"')]+)(["']?\s*\))/g;
const CSS_IMG_REG = /(:\s*)(url\(\s*['"]?)(\.+\/)*(images|ossweb-img)/g;

export default class FenliPatch extends Patch {
  private fenliPath: string;
  constructor() {
    super('FenliPatch');
  }

  setFenliPath(p) {
    this.fenliPath = p;
  }

  async prepare(): Promise<any> {
    return Promise.resolve()
  }

  detect(file: string) {
    const ext = path.extname(file);
    return ['.html', '.shtml', '.htm', '.inc', '.css'].indexOf(ext) >= 0;
  }

  run(info: PatchInfo) {
    if (!this.fenliPath) {
      throw new Error('分离地址为空，请检查。')
    }
    const ext = path.extname(info.src);
    const isCssFile = ['.css'].indexOf(ext) >= 0;
    // return this._stream(isCssFile);
    return this._replace(isCssFile);
  }
  _replace(isCssFile) {
    var self = this
    return (line: string) : string => {
      let chunk = line;
      if (isCssFile) {
        chunk = self.replaceRelativeUrlsInStyle(chunk);
      } else {
        chunk = self.replaceRelativeUrlsInStyle(chunk);
        chunk = self.replaceRelativeUrlsInHTMLTag(chunk);
      }
      return chunk;
    }
  }
  _stream(isCssFile){
    var self = this
    return new Transform({
      transform: function(chunk, enc, callback) {
        // 打印，检测替换内容是否位于chunk边界。
        console.log('chunk-----')
        console.log(chunk.substr(0, 100));
        console.log(chunk.substr(chunk.length - 100));
        console.log('chunk+++++')
        if (isCssFile) {
          chunk = self.replaceRelativeUrlsInStyle(chunk);
        } else {
          chunk = self.replaceRelativeUrlsInStyle(chunk);
          chunk = self.replaceRelativeUrlsInHTMLTag(chunk);
        }

        this.push(chunk)

        callback();
      }
    })
  }

  /**
   * 替换样式中的相对路径地址（包含ossweb-img|images）
   * 只查找 url() 结构
   * @param chunk
   */
  replaceRelativeUrlsInStyle(chunk) {
    chunk = chunk.replace(CSS_IMG_REG, (match) => {
      return match ? match.replace(/(\.+\/)*(images|ossweb-img)/, this.fenliPath) : match;
    })
    return chunk;
  }

  /**
	 * 替换HTML标签内的相对路径地址（包含ossweb-img|images）
   * 可包含URL的HTML标签完整列表
   * https://www.w3.org/TR/REC-html40/index/attributes.html Type为URI的元素
   * 完整列表
   * https://stackoverflow.com/questions/2725156/complete-list-of-html-tag-attributes-which-have-a-url-value
   * 
   * 综合常用标签，处理src、href、poster属性
   * src属性(https://www.w3schools.com/tags/att_href.asp) img,audio,video,script,iframe,source...
   * href属性(https://www.w3schools.com/tags/att_href.asp) a,link,area,base
   * poster属性 video
   * 
   * 注意
   * 1. 不会处理懒加载等场景下添加的自定义属性。如<div data-lazy=url />
   * 2. 不会处理<form action=url>、<button formaction=url>、<head profile=url>等
   * 
	 * @param {*} res 
	 */
  replaceRelativeUrlsInHTMLTag(chunk) {
    // TODO:
    // https://github.com/peerigon/batch-replace/
    chunk = chunk.replace(HTML_TAG_IMG_REG, (match, p1, p2, p3, p4, p5) => {
      return match ? match.replace(/(\.+\/)*(images|ossweb-img)/, this.fenliPath) : match;
    });
    return chunk;
  }
}