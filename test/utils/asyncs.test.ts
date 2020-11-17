import { cp, walkFile, WalkFileHandler } from '../../src/utils/asyncs'

describe('asyncs', () => {
  describe('walkFile', () => {
    test('valid src', async () => {
      try {
        await walkFile('./test/u', (p: WalkFileHandler) => {
          return Promise.resolve()
        })
      } catch (error) {
        expect(error).toEqual(new Error('src is invalid'))
      }
    })
    test('src is a directory which have many files', async () => {
      expect.assertions(8);
      const FILES = [
        'test/utils',
        'test/utils/asyncs.test.ts',
        'test/utils/FileUtil.test.ts',
        'test/utils/index.test.ts'
      ]
      try {
        let i = 0;
        await walkFile('./test/utils', (p: WalkFileHandler) => {
          expect(['file','dir'].indexOf(p.type)).toBeGreaterThanOrEqual(0)
          console.log(p.filePath)
          expect(FILES.some(f => p.filePath.indexOf(f) >= 0)).toEqual(true);
          i++;
          
          return Promise.resolve()
        })
      } catch (error) {
        expect(error).toEqual(new Error('src is not valid'))
      }
    })
  })
  describe('cp', () => {
    test('empty src', async () => {
      expect.assertions(1);
      try {
        await cp('', './__test/')
      } catch (error) {
        expect(error).toEqual(new Error('cp src is not exist'))
      }
    })
    test('invalid src', async () => {
      expect.assertions(1);
      try {
        await cp('./__test/indexxx.html', './__test/')
      } catch (error) {
        expect(error).toEqual(new Error('cp src is not exist'))
      }
    })
    test('file src', async () => {
      await cp('./__test/index.html', './__test/index2.html')
      // TODO:
    })
    test('dir src', async () => {
      await cp('./__test/css', './__test/ossweb-img/css')
      // TODO:
    })
  })
  
})