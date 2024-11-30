import fs from 'node:fs';
import chalk from 'chalk';
import ini from 'ini';
import mockFs from 'mock-fs';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { NPMRC, NRMRC, REGISTRY } from '../src/constants';
import {
  geneDashLine,
  getCurrentRegistry,
  getRegistries,
  isInternalRegistry,
  isLowerCaseEqual,
  isRegistryNotFound,
  readFile,
  writeFile,
} from '../src/helpers';

beforeAll(() => {
  mockFs({
    [NPMRC]: '',
    [NRMRC]: '',
  });
});

afterAll(() => {
  mockFs.restore();
});

it('geneDashLine', () => {
  const result1 = geneDashLine('taobao', 10);
  const result2 = geneDashLine('taobao', 1);
  expect(result1).toBe(` ${chalk.dim('-----')} `);
  expect(result2).toBe(` ${chalk.dim('-')} `);
});

it('getCurrentRegistry', async () => {
  const registry = ' https://registry.npmjs.org/';
  fs.writeFileSync(NPMRC, ini.stringify({ [REGISTRY]: registry }));
  const currentRegistry = await getCurrentRegistry();
  expect(currentRegistry).toBe(registry);
});

it('getRegistries', async () => {
  const name = 'fake name';
  const registry = 'https://registry.example.com/';
  fs.writeFileSync(NRMRC, ini.stringify({ [name]: { registry } }));
  const registries = await getRegistries();
  expect(Object.keys(registries).includes(name)).toBe(true);
});

it('readFile', async () => {
  const content = 'hello nrm';
  fs.writeFileSync(NRMRC, ini.stringify({ content: content }));
  const result1 = await readFile(NRMRC);
  const result2 = await readFile('file not exist');
  expect(result1.content).toBe(content);
  expect(result2).toEqual(Object.create(null));
});

it('writeFile', async () => {
  const content = { nrm: 'nrm is great' };
  await writeFile(NRMRC, { content });
  const result = await readFile(NRMRC);
  expect(result.content).toEqual(content);
});

it('isLowerCaseEqual', () => {
  const result1 = isLowerCaseEqual('taobao', 'TAOBAO');
  const result2 = isLowerCaseEqual('jd', 'tb');
  const result3 = isLowerCaseEqual('taobao', '');
  const result4 = isLowerCaseEqual('', '');
  expect(result1).toBe(true);
  expect(result2).toBe(false);
  expect(result3).toBe(false);
  expect(result4).toBe(true);
});

it('isRegistryNotFound', async () => {
  const unknown = 'unknown';
  const name = 'custom name';
  const registry = 'https://registry.example.com/';
  fs.writeFileSync(NRMRC, ini.stringify({ [name]: registry }));
  const result1 = await isRegistryNotFound(unknown, false);
  const result2 = await isRegistryNotFound(name, false);
  expect(result1).toBe(true);
  expect(result2).toBe(false);
});

it('isInternalRegistry', async () => {
  const name = 'custom name';
  const registry = 'https://registry.example.com/';
  fs.writeFileSync(NRMRC, ini.stringify({ [name]: registry }));
  const result1 = await isInternalRegistry(name);
  const result2 = await isInternalRegistry('npm');
  expect(result1).toBe(false);
  expect(result2).toBe(true);
});
