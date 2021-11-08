// silent `program.outputHelp()` (cli.js#L127)
// DO NOT remove this line and put it BEFORE `require('./cli.js')` statement
process.argv.push('anything');

const fs = require('fs');
const ini = require('ini');
const tap = require('tap');
const { beforeEach, afterEach, test, mock } = tap;
const { stdout, stderr } = require('test-console');
const { NRMRC, NPMRC, FIELD_HOME, FIELD_REGISTRY, FIELD_IS_CURRENT } = require('./cli');

/**
 * ==========  mock file system ==========
 */

let mockedFiles = Object.create(null);

function readFileSync(path) {
  return mockedFiles[path];
}

function writeFile(path, content, callback) {
  mockedFiles[path] = content;
  callback && callback();
}

function existsSync(path) {
  return path in mockedFiles;
}

/**
 * ==========  mock `fs` within `cli.js` ==========
 */

const cli = mock('./cli.js', {
  fs: {
    writeFile,
    existsSync,
    readFileSync,
  },
});

/**
 * ========== clear file system cache ==========
 */

let npmrc;

beforeEach(() => {
  mockedFiles = Object.create(null);
  // stash real `.npmrc` file content
  // because `npm.commands.config` statement will write this file
  npmrc = fs.readFileSync(NPMRC, 'utf-8');
  fs.writeFileSync(NPMRC, '');
});

afterEach(() => {
  // recover `.npmrc` file content
  fs.writeFileSync(NPMRC, npmrc);
});

/**
 * ========== test cases ==========
 */
test('getCurrentRegistry', t => {
  cli.getCurrentRegistry(registry => {
    t.equal(typeof registry, 'string', 'registry is a string type');
    t.equal(/^https?:\/\//.test(registry), true, 'registry must be start with `https://` or `http://`');
    t.end();
  });
});

test('getCustomRegistry', t => {
  const fakeName = 'fake name';
  const fakeRegistry = 'fake registry';
  writeFile(NRMRC, ini.stringify({
    [fakeName]: {
      registry: fakeRegistry,
      [FIELD_IS_CURRENT]: true,
    },
  }));
  const registries = cli.getCustomRegistry();
  t.equal(typeof registries, 'object', 'registries is a plain object');
  t.equal(registries[fakeName].registry, fakeRegistry, 'can get custom registries');
  t.end();
});

test('getAllRegistry', t => {
  const name = 'taobao';
  const registry = 'https://baidu.com/';
  writeFile(NRMRC, ini.stringify({ [name]: { registry: registry } }));
  const registries = cli.getAllRegistry();
  t.equal(typeof registries, 'object', 'registries is a plain object');
  t.ok(Object.keys(registries).includes(name), 'can get all registries');
  t.end();
});

test('getNPMInfo', t => {
  const fakeRegistry = 'https://www.baidu.com';
  writeFile(NPMRC, ini.stringify({ registry: fakeRegistry }));
  const registry = cli.getNPMInfo();
  t.equal(typeof registry, 'object', 'can get npm config as an object');
  t.equal(registry.registry, fakeRegistry, 'can get npm config rightly');
  t.end();
});

test('getINIInfo', t => {
  const path = 'any path';
  const content = { nrm: 'nrm is great' };
  writeFile(path, ini.stringify(content));
  const result1 = cli.getINIInfo(path);
  const result2 = cli.getINIInfo('path not exist');
  t.equal(typeof result1, 'object', 'can get an plain object if file is exist');
  t.equal(typeof result2, 'object', 'can get an plain object if file is not exist');
  t.equal(JSON.stringify(result1), JSON.stringify(content), 'can get file content rightly');
  t.equal(JSON.stringify(result2), JSON.stringify({}), 'can get an empty object');
  t.end();
});

test('line', t => {
  const result1 = cli.line('taobao', 10);
  const result2 = cli.line('taobao', 1);
  t.equal(result1, ` ----- `, 'line(taobao, 10) equal to ` ----- `');
  t.equal(result2, ` - `, 'line(taobao, 1) equal to ` - `');
  t.end();
});

test('equalsIgnoreCase', t => {
  const result1 = cli.equalsIgnoreCase('taobao', 'TAOBAO');
  const result2 = cli.equalsIgnoreCase('jd', 'tb');
  const result3 = cli.equalsIgnoreCase('taobao', '');
  const result4 = cli.equalsIgnoreCase('', '');
  t.equal(result1, true, '`taobao` is considered equal to `TAOBAO`');
  t.equal(result2, false, '`jd` is not equal to `tb`');
  t.equal(result3, false, '`taobao` is not equal to empty string');
  t.equal(result4, true, 'two empty strings are considered equal');
  t.end();
});

test('hasOwnProperty', t => {
  const obj = { name: 'nrm' };
  const result1 = cli.hasOwnProperty(obj, 'name');
  const result2 = cli.hasOwnProperty(obj, 'age');
  t.equal(result1, true, '`name` is exist in `obj`');
  t.equal(result2, false, '`age` is not exist in `obj`');
  t.end();
});

test('printErr', t => {
  const error = 'hello nrm';
  const output = stderr.inspectSync(() => cli.printErr(error));
  t.same(output, printLineByLine('an error occurred: ' + error), 'can print error message');
  t.end();
});

test('printMsg', t => {
  const output = stdout.inspectSync(() => cli.printMsg(['hello', 'nrm']));
  t.same(output, printLineByLine('hello', 'nrm'), 'can print message');
  t.end();
});

test('showCurrent', t => {
  // TODO
  // cli.onUse('taobao');
  t.end();
});

test('config', t => {
  const home = 'https://home.com/';
  const registry = 'https://registry.com/';

  cli
    .config([FIELD_REGISTRY, FIELD_HOME], { registry, home })
    .then(() => {
      cli.getCurrentRegistry((cur) => {
        const npmrc = ini.parse(fs.readFileSync(NPMRC, 'utf-8'));
        t.equal(cur, registry, 'can get registry rightly');
        t.equal(npmrc.registry, registry, 'can set registry rightly');
        t.equal(npmrc.home, home, 'can set home rightly');
        t.end();
      });
    });
});

function printLineByLine(...lines) {
  const output = [];
  for (let i = 0; i < lines.length; i++) {
    output.push(lines[i] + '\n');
  }
  return output;
}
