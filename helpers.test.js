const ini = require('ini');
const tap = require('tap');
const chalk = require('chalk');
const { beforeEach, test, mock } = tap;
const { stdout, stderr } = require('test-console');

const { NPMRC, NRMRC, REGISTRY } = require('./constants');

// ========== mock `fs` within helpers.js ==========

let mockedFiles = Object.create(null);

function readFileSync(path) {
  return mockedFiles[path];
}

function writeFileSync(path, content) {
  mockedFiles[path] = content;
}

function existsSync(path) {
  return path in mockedFiles;
}

const helpers = mock('./helpers.js', {
  fs: {
    existsSync,
    readFileSync,
    writeFileSync,
  },
});

// ========== test cases ==========

beforeEach(() => {
  mockedFiles = Object.create(null);
  mockedFiles[NPMRC] = '';
  mockedFiles[NRMRC] = '';
});

test('geneDashLine', t => {
  const result1 = helpers.geneDashLine('taobao', 10);
  const result2 = helpers.geneDashLine('taobao', 1);
  t.equal(result1, ` ${chalk.dim('-----')} `, 'geneDashLine(taobao, 10) equal to ` ----- `');
  t.equal(result2, ` ${chalk.dim('-')} `, 'geneDashLine(taobao, 1) equal to ` - `');
  t.end();
});

test('getCurrentRegistry', async t => {
  const registry = ' https://registry.npmjs.org/';
  writeFileSync(NPMRC, ini.stringify({ [REGISTRY]: registry }));
  const currentRegistry = await helpers.getCurrentRegistry();
  t.equal(currentRegistry, registry, 'can get the current registry in use');
  t.end();
});

test('getRegistries', async t => {
  const name = 'fake name';
  const registry = 'https://registry.example.com/';
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry } }));
  const registries = await helpers.getRegistries();
  t.equal(Object.keys(registries).includes(name), true, 'can get all registries');
  t.end();
});

test('readFile', async t => {
  const content = 'hello nrm';
  writeFileSync(NRMRC, ini.stringify({ content: content }));
  const result1 = await helpers.readFile(NRMRC);
  const result2 = await helpers.readFile('file not exist');
  t.equal(result1.content, content, 'can get the file content');
  t.same(result2, Object.create(null), 'can get an empty object when file is not exist');
  t.end();
});

test('writeFile', async t => {
  const content = { nrm: 'nrm is great' };
  await helpers.writeFile(NRMRC, { content });
  const result = await helpers.readFile(NRMRC);
  t.same(result.content, content, 'can write content to the file');
  t.end();
});

test('isLowerCaseEqual', t => {
  const result1 = helpers.isLowerCaseEqual('taobao', 'TAOBAO');
  const result2 = helpers.isLowerCaseEqual('jd', 'tb');
  const result3 = helpers.isLowerCaseEqual('taobao', '');
  const result4 = helpers.isLowerCaseEqual('', '');
  t.equal(result1, true, '`taobao` is considered equal to `TAOBAO`');
  t.equal(result2, false, '`jd` is not equal to `tb`');
  t.equal(result3, false, '`taobao` is not equal to an empty string');
  t.equal(result4, true, 'two empty strings are considered equal');
  t.end();
});

test('printError', t => {
  const error = 'an error';
  const output = stderr.inspectSync(() => helpers.printError(error));
  t.same(output, printLineByLine(chalk.bgRed(' ERROR ') + ' ' + chalk.red(error)), 'can print an error message');
  t.end();
});

test('printSuccess', t => {
  const message = 'hello nrm';
  const output = stdout.inspectSync(() => helpers.printSuccess(message));
  t.same(output, printLineByLine(chalk.bgGreenBright(' SUCCESS ') + ' ' + message), 'can print a success message');
  t.end();
});

test('printMessages', t => {
  const output = stdout.inspectSync(() => helpers.printMessages(['hello', 'nrm']));
  t.same(output, printLineByLine('hello', 'nrm'), 'can print a group messages');
  t.end();
});

function printLineByLine(...lines) {
  return lines.map(line => line + '\n');
}
