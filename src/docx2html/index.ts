
import path from 'path';
import Handler from '../Handler';
import _ from 'lodash';
import { promises as fs } from 'fs'
import { walkFile } from '../utils/asyncs';
import { logger, logMsg } from '../utils';
import FileUtil from '../utils/FileUtil';
import mammoth from 'mammoth';
import { load } from 'cheerio';
import beautify from "js-beautify";

const log = logger('Docx2Html')

type fileMappingItem = {
  url: string,
  file: string,
  title?: string
}
let fileMapping: fileMappingItem[] = [];


export default class Docx2Html extends Handler {

  private input: string;
  private output: string;
  private imageFolder: string;

  private filenamePrev = 'index';
  private filenameIndex = 1;
  private imageCounter = 1;
  private curFilename = '';

  constructor(input, output) {
    super();

    this.input = input;
    this.output = output;
  }
  async run() {
    let { input, output } = this;
    const inputStats = await fs.lstat(input);
    if (inputStats.isDirectory()) {
      if (!output) {
        log(logMsg(`请设置输出路径 -o`, 'ERROR'))
        throw new Error('output unfound');
      }
      await FileUtil.createFolder(output)
      const imageFolder = path.join(output, 'ossweb-img');
      await FileUtil.createFolder(imageFolder)
      await walkFile(input, async ({ filePath, type }) => {
        if (type === 'file') {
          if (path.extname(filePath) == '.docx') {
            log(`start -->> ${filePath}`)
            this.imageCounter = 1;
            // console.log(filenameIndex)
            this.curFilename = `${this.filenamePrev}${this.filenameIndex}`
            // console.log(curFilename)
            let imgDir = path.join(output, 'ossweb-img', this.curFilename);
            await FileUtil.createFolder(imgDir)
            await this.convertDocx(filePath, this.curFilename)
            this.filenameIndex++;
            log(` ------- `)
          }
        }
      })
      await this.saveFileMapping();
    } else if (inputStats.isFile()) {
      if (!output) {
        output = path.basename(input);
        output = path.join(path.dirname(input), output.split('.')[0]);
        this.output = output;
        await FileUtil.createFolder(output)
        const imageFolder = path.join(output, 'ossweb-img');
        await FileUtil.createFolder(imageFolder);
        log(`start -->> ${input}`)
        this.imageCounter = 1;
        // console.log(filenameIndex)
        await this.convertDocx(input, this.filenamePrev)
        log(` ------- `)
      }
    } else {
      log(logMsg(`请检查路径`, 'ERROR'))
      throw new Error('input error');
    }
  }

  async saveHtml(content: string, filename: string) {
    const { output } = this;
    let htmlPath = path.join(output, filename + '.html');
    await fs.writeFile(htmlPath, content, 'utf-8')
    log(`${htmlPath} was saved.`)
  }

  async modifyHtml(html: string) {
    let $ = load(html);
    // 如果第一个元素是p标签，则转换成h2标签
    if (html.indexOf('<p') === 0) {
      // console.log('converttt')
      let title = $('p').eq(0).html()
      log(`title: ${title}`)
      $('p').eq(0).replaceWith(`<h2>${title}</h2>`)
    }
    // 移除img alt换行文本，因为有些文本会换行。
    $('img').addClass('docx-img').attr('alt', '');
    // table如果没有thead，则把tbody首个tr的td改为th，放进thead
    // 如果表头有多行？结构就会有问题。
    // $('table').each(function(i, table) {
    //   $(table).addClass('docx-table')
    //   if ($(table).find('thead').length <= 0 && $(table).find('th').length <= 0) {
    //     const firstTR = $(table).addClass('doxc-table').find('tbody').find('tr').first().remove();
    //     firstTR.find('td').each(function(i, el) {
    //       $(el).replaceWith('<th>' + $(el).html() + '</th>')
    //     })
    //     $('<thead></thead>').html(firstTR).prependTo(table)
    //   }
    // })
    // 如果文本以 - 开头，则添加indent1样式。
    $('p').each(function(i, el) {
      if ($(el).text().indexOf('-') === 0) {
        $(el).addClass('docx-indent1');
      }
    })
    
    html = $.html()
    return html;
  }

  async convertDocx(file: string, filename: string) {
    try {
      let result = await mammoth.convertToHtml({ path: file }, {
        convertImage: mammoth.images.imgElement(async (image) => {
          const imageBuffer = await image.readAsBase64String();
          let imgType = image.contentType.split('/').pop();
          // console.log(`imgType: ${imgType}`
          if (imgType == 'x-emf') {
            imgType = 'png'
          }
          const imgName = `docx-image${this.imageCounter}.${imgType}`;
          let imgDir = path.join(this.output, 'ossweb-img', this.curFilename);
          const imgPath = path.join(imgDir, imgName);
          await fs.writeFile(imgPath, imageBuffer, 'base64');
          log(`${imgPath} was saved.`);
      
          this.imageCounter++;
      
          return {
            src: path.relative(this.output, imgPath)
          };
        }),
      });
      let docxFile = path.basename(file);
      let html = result.value; // The generated HTML
      html = await this.modifyHtml(html);
      let $ = load(html);
      let title = $('h2').eq(0).text()
      html = $.html()
      
      fileMapping.push({
        url: `${this.curFilename}.html`,
        file: docxFile,
        title
      })
      
      // var messages = result.messages; // Any messages, such as warnings during conversion
      // console.log(html)
      
      html = await beautify.html(html, { indent_size: 4 });
      await this.saveHtml(html, filename)
      // console.log(messages)
    } catch (error) {
      console.error(error);
    }
  }

  async saveFileMapping() {
    const { output } = this;
    let mappingPath = path.join(output, 'all.json');
    let content = JSON.stringify(fileMapping);
    content = beautify.js(content, { indent_size: 4, space_in_empty_paren: true });
    await fs.writeFile(mappingPath, content, 'utf-8')
    log(`${mappingPath} was saved.`)
  }

  shutdownHandler() {
    log(logMsg('shutdown'));
  }
}