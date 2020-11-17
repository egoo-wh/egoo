import * as path from 'path';
import { Patch, PatchInfo, PatchInstaller } from "../../src/core/patch"
import FileUtil from "../../src/utils/FileUtil";
import * as throught2 from 'through2';

describe('Patch', () => {
  test('add', () => {
    const dest = Patch.prototype.add.call(Patch.prototype, './__test/index.js');
    expect(dest).toEqual(path.normalize('./__test/~index.js'))
  })
})

class SamplePatch extends Patch {
  constructor() {
    super('SamplePatch')
  }
  detect(file: string): boolean{
    const ext = path.extname(file);
    return ['.js'].indexOf(ext) >= 0;
  }
  async prepare(): Promise<any> {
    expect(1).toBeTruthy();
    return Promise.resolve('1')
  }
  run(info: PatchInfo): any {
    expect(info).toBeTruthy();
    return throught2.obj(function (chunk, enc, callback) {
      this.push(chunk)

      callback();
    })
  }
}
class SamplePatch2 extends Patch {
  constructor() {
    super('SamplePatch2')
  }
  detect(file: string): boolean {
    const ext = path.extname(file);
    return ['.html'].indexOf(ext) >= 0;
  }
  async prepare(): Promise<any> {
    expect(1).toBeTruthy();
    return Promise.resolve('2')
  }
  run(info: PatchInfo): any {
    expect(info).toBeTruthy();
    return throught2.obj(function (chunk, enc, callback) {
      this.push(chunk)

      callback();
    })
  }
}
class SamplePatch3 extends Patch {
  constructor() {
    super('SamplePatch3')
  }
  detect(file: string): boolean {
    const ext = path.extname(file);
    return ['.html'].indexOf(ext) >= 0;
  }
  async prepare(): Promise<any> {
    expect(1).toBeTruthy();
    return Promise.resolve('3')
  }
  run(info: PatchInfo): any {
    expect(info).toBeTruthy();
    return throught2.obj(function (chunk, enc, callback) {
      this.push(chunk)

      callback();
    })
  }
}

let pi: PatchInstaller, sp: Patch, sp2: Patch, sp3: Patch;
beforeAll(() => {
  pi = new PatchInstaller();
})
describe('PatchInstaller', () => {
  test('reigster', () => {
    sp = new SamplePatch();
    pi.register(sp);
    expect(pi['patchs'].length).toBe(1);
  })
  test('register twice', () => {
    pi.register(sp);
    expect(pi['patchs'].length).toBe(1);
  })
  test('registers', () => {
    sp2 = new SamplePatch2()
    pi.registers([sp2]);
    expect(pi['patchs'].length).toBe(2);
  })
  test('detect', () => {
    let ps = pi.detect('./__test/index.html');
    expect(ps.length).toBe(1);

    ps = pi.detect('./__test/index.js');
    expect(ps.length).toBe(1)
    expect(ps.map(p => p.name)).toEqual([sp.name]);
  })
  test('detechAndAdd', () => {
    let ps = pi.detectAndAdd('./__test/index.js');
    expect(ps.length).toBe(1)
    expect(ps[0]).toBe(path.normalize('./__test/~index.js'))
  })
  test('merge', () => {
    sp3 = new SamplePatch3();
    pi.register(sp3);
    pi.detectAndAdd('./__test/index.html');
    const mergedInfos = pi.merge();
    expect(mergedInfos.length).toBe(2);
    expect(mergedInfos.map(p => p.patch)).toEqual([[sp.name], [sp2.name, sp3.name]])
  })
  test('run', async () => {
    // const mergeMocker = jest.spyOn(pi, 'merge').mockImplementation(() => {
    //   return pi.merge();
    // })
    const modifyMocker = jest.spyOn(FileUtil, 'modify').mockImplementation((inputPath, outputPath, streams) => {
      if (inputPath == './__test/index.html') {
        expect(outputPath).toEqual(path.normalize('./__test/~index.html'))
        expect(streams.length).toBe(2);
      }
      if (inputPath == './__test/index.js') {
        expect(outputPath).toEqual(path.normalize('./__test/~index.js'))
        expect(streams.length).toBe(1);
      }
      return Promise.resolve()
    })

    // preload 3 run 3 + 4 + 1
    expect.assertions(11);

    await pi.run();
    // expect(sp.prepare).toBeCalledTimes(1);
    // expect(sp2.prepare).toBeCalledTimes(1);
    // expect(sp3.prepare).toBeCalledTimes(1);
    // expect(mergeMocker).toBeCalledTimes(1);
    expect(modifyMocker).toBeCalledTimes(2);
  })
})