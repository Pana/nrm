const ini = require('ini');
const chalk = require('chalk');
const fs = require('fs');
const mockFs = require('mock-fs');

const helpers = require('.././helpers');

const { NPMRC, NRMRC, REGISTRY } = require('.././constants');

beforeEach(() => {
  mockFs({
    [NPMRC]: '',
    [NRMRC]: '',
  });
});

afterEach(() => {
  mockFs.restore();
});

it('geneDashLine', () => {
  const result1 = helpers.geneDashLine('taobao', 10);
  const result2 = helpers.geneDashLine('taobao', 1);
  expect(result1).toBe(` ${chalk.dim('-----')} `);
  expect(result2).toBe(` ${chalk.dim('-')} `);
});

it('getCurrentRegistry', async () => {
  const registry = ' https://registry.npmjs.org/';
  fs.writeFileSync(NPMRC, ini.stringify({ [REGISTRY]: registry }));
  const currentRegistry = await helpers.getCurrentRegistry();
  expect(currentRegistry).toBe(registry);
});

it('getRegistries', async () => {
  const name = 'fake name';
  const registry = 'https://registry.example.com/';
  fs.writeFileSync(NRMRC, ini.stringify({ [name]: { registry } }));
  const registries = await helpers.getRegistries();
  expect(Object.keys(registries).includes(name)).toBe(true);
});

it('readFile', async () => {
  const content = 'hello nrm';
  fs.writeFileSync(NRMRC, ini.stringify({ content: content }));
  const result1 = await helpers.readFile(NRMRC);
  const result2 = await helpers.readFile('file not exist');
  expect(result1.content).toBe(content);
  expect(result2).toEqual(Object.create(null));
});

it('writeFile', async () => {
  const content = { nrm: 'nrm is great' };
  await helpers.writeFile(NRMRC, { content });
  const result = await helpers.readFile(NRMRC);
  expect(result.content).toEqual(content);
});

test('isLowerCaseEqual', () => {
  const result1 = helpers.isLowerCaseEqual('taobao', 'TAOBAO');
  const result2 = helpers.isLowerCaseEqual('jd', 'tb');
  const result3 = helpers.isLowerCaseEqual('taobao', '');
  const result4 = helpers.isLowerCaseEqual('', '');
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
  const result1 = await helpers.isRegistryNotFound(unknown, false);
  const result2 = await helpers.isRegistryNotFound(name, false);
  expect(result1).toBe(true);
  expect(result2).toBe(false);
});

it('isInternalRegistry', async () => {
  const name = 'custom name';
  const registry = 'https://registry.example.com/';
  fs.writeFileSync(NRMRC, ini.stringify({ [name]: registry }));
  const result1 = await helpers.isInternalRegistry(name);
  const result2 = await helpers.isInternalRegistry('npm');
  expect(result1).toBe(false);
  expect(result2).toBe(true);
});
