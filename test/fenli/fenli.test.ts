import Fenli from "../../src/fenli/Fenli";

let fenli: Fenli;
beforeAll(() => {
  fenli = new Fenli('./__test')
})

test('getFenliPath',  async () => {
  const p = await fenli.getFenliPath('dnf', null)
  expect(p).toEqual('//game.gtimg.cn/images/dnf/cp/')
})

test('init', async () => {
  const p = await fenli.init('dnf', null);
  expect(p).toEqual('//game.gtimg.cn/images/dnf/cp/')
})