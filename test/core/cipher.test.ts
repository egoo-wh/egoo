import Cipher, { cipher } from '../../src/core/cipher'
import * as path from 'path';
import * as fs from 'fs';
import * as util from 'util';
const fsreadFile = util.promisify(fs.readFile);

const root = path.join(__dirname, '../..');
let keypath = path.join(root, 'data', '.egookey');
let cipher: cipher;
beforeAll(async () => {
  const secret = await fsreadFile(keypath, 'utf-8');
  cipher = Cipher(secret);
})

const SAMPLE = '{ "name": "CipherTest" }'
test('cipher1', async () => {
  // encrypt
  const sample = JSON.parse(SAMPLE)
  const encrypted = cipher.encrypt(sample)
  // decrypt
  let encryptedJSON = JSON.parse(encrypted)
  const decrypted = cipher.decrypt(encryptedJSON);
  expect(decrypted).toMatchObject({ name: 'CipherTest'})
})


const SAMPLE2 = '{"iv":"2980baca78815dcc4b746628c22772fe","data":"a4b22f28dc0cc2ae22132bc465dbdef6c9b2907e5b50feb2010177d48eeafc83f917222600f205841162423049996d430b5954ef193872dc9444072e2c7509b36d40b0ddd3063560b6d1a2a73e905d4624d45e252ebb736c80ed9e2d7a5148ccee62e46e49b28629d66e93ecad973d03"}'
test('decrypt', () => {
  let encryptedJSON = JSON.parse(SAMPLE2)
  const decrypted = cipher.decrypt(encryptedJSON);
  expect(typeof decrypted).toBe('object')
  expect(decrypted).toHaveProperty('host')
  expect(decrypted).toHaveProperty('port')
  expect(decrypted).toHaveProperty('username')
  expect(decrypted).toHaveProperty('password')
  expect(decrypted).toHaveProperty('path')
})