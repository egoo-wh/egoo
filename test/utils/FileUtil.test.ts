import FileUtil from "../../src/utils/FileUtil"
import { Transform } from 'readable-stream';

test('detectFileEncode', async () => {
  const enc = await FileUtil.detectFileEncode('./__test/index.html');
  expect(enc).toBe('GB2312')
})
test('isFileEncodeEqual', () => {
  expect(FileUtil.isFileEncodeEqual('GBK', 'GB2312')).toBe(true)
})

describe('modify', () => {
  test('normal', async () => {
    const replace = (line) => {
      line = line.replace(/ossweb-img/g, 'images')
      return line
    }
    await FileUtil.modify('./__test/index.html', './__test/~index.html', [replace]);
  })
  test('chunk boundary', async () => {
    const replace = (line) => {
      line = line.replace(/ossweb-img/g, 'images')
      return line
    }
    await FileUtil.modify('./__test/chunk_boundary.html', './__test/~chunk_boundary.html', [replace]);
  })
})

// describe('modifyByStreams', () => {
//   test('normal', async () => {
//     const s1 = new Transform({
//       transform: function (chunk, enc, callback) {
//         chunk = chunk.replace(/ossweb-img/g, 'images')
//         this.push(chunk);

//         callback();
//       }
//     })
//     await FileUtil.modifyByStreams('./__test/index.html', './__test/~index.html', [s1]);
//   })
//   test('chunk boundary', async () => {
//     const s2 = new Transform({
//       transform: function (chunk, enc, callback) {
//         console.log('chunk--')
//         console.log(chunk.substr(0, 100));
//         console.log(chunk.substr(chunk.length - 100));
//         console.log('chunk++')
//         chunk = chunk.replace(/ossweb-img/g, 'images')
//         this.push(chunk);

//         callback();
//       }
//     })
//     await FileUtil.modifyByStreams('./__test/chunk_boundary.html', './__test/~chunk_boundary.html', [s2]);
//   })
// })

// test('modify no streams', async () => {
//   await FileUtil.modify('./__test/index.html', './__test/~index.html', []);
// })