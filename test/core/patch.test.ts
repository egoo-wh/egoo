import * as path from 'path';
import { Patch, PatchInfo, PatchInstaller } from "../../src/core/patch"
import FileUtil from "../../src/utils/FileUtil";

class SamplePatch extends Patch {
  constructor(patchName) {
    super(patchName)
  }
  detect(file: string): boolean{
    const ext = path.extname(file);
    return ['.js'].indexOf(ext) >= 0;
  }
  async prepare(): Promise<any> {
    expect(1).toBeTruthy();
    return Promise.resolve('1')
  }
  run(info: PatchInfo) {
    expect(info).toBeTruthy();
    return (line: string) => {
      return line;
    }
  }
}

let sp: SamplePatch;
describe('patch', () => {
  sp = new SamplePatch('SamplePatch');
  test('detect', () => {
    expect(sp.detect('./__test/index.js')).toEqual(true);
  })
  // prepare未使用
  test('is prepare exec before run', () => {

  })
})

let pi: PatchInstaller;
beforeAll(() => {
  pi = new PatchInstaller();
})
describe('PatchInstaller', () => {
  test('reigster', () => {
    pi.register(sp);
    expect(pi['patchs'].length).toBe(1);
  })
  test('register twice', () => {
    pi.register(sp);
    expect(pi['patchs'].length).toBe(1);
  })
  test('detect', () => {
    let ps = pi.detect('index.html');
    expect(ps.length).toBe(0);

    ps = pi.detect('index.js');
    expect(ps.length).toBe(1)
    expect(ps.map(p => p.name)).toEqual([sp.name]);
  })
  test('add', () => {
    let info = pi.add([sp], 'index.js');
    expect(info.dest).toBe(path.normalize('~index.js'))
  })
  test('add once more', () => {
    pi.add([sp], 'comm.js');
    expect(pi.infos.length).toEqual(2);
  })
  test('run', async () => {
    // const mergeMocker = jest.spyOn(pi, 'merge').mockImplementation(() => {
    //   return pi.merge();
    // })
    jest.spyOn(FileUtil, 'modify').mockImplementation((inputPath, outputPath, replaces) => {
      if (inputPath == 'index.js') {
        expect(outputPath).toEqual(path.normalize('~index.js'))
        expect(replaces.length).toBe(1);
      }
      return Promise.resolve()
    })

    expect.assertions(3);

    await pi.run(pi.infos[0]);
  })
})