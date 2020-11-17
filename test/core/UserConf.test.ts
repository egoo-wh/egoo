import * as path from 'path';
import UserConf from '../../src/core/UserConf'
import { setAppRoot, getLocalURL } from '../../src/utils/index'
import * as fs from 'fs';

beforeAll(() => {
  setAppRoot(path.join(__dirname, '../..'))
})

const configTestFileName = 'user_conf_test.json'
describe('get & add & save', () => {
  beforeAll(async () => {
    await UserConf.getInstance().include(configTestFileName)
  })
  test('get', () => {
    expect(UserConf.getInstance().get('tinypng.api_key')).toEqual('k7BJYLoBf7Wzg2ypeky5u-yM0fKeBIPJ')
  })

  test('add', () => {
    UserConf.getInstance().add('text', 'hello');
    expect(UserConf.getInstance().get('text')).toEqual('hello')
  })

  test('add nested', () => {
    UserConf.getInstance().add('app.name', 'Egoocli');
    expect(UserConf.getInstance().get('app')).toMatchObject({ name: 'Egoocli' })
  })

  test('save', async () => {
    UserConf.getInstance().add('app.name', 'Egoocli');
    await UserConf.getInstance().save();
    const c = await fs.readFileSync(getLocalURL(configTestFileName))
    expect(c.indexOf('"app":{"name":"Egoocli"}')).toBeGreaterThan(0)
  })
})

