const ini = require('ini');
const tap = require('tap');
const chalk = require('chalk');
const { beforeEach, test, mock } = tap;
const { stdout, stderr } = require('test-console');

const { NPMRC, NRMRC, REGISTRY, REGISTRIES } = require('./constants');

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
  './process': {
    exit: () => console.log('process exit'),
  },
});

const actions = mock('./actions.js', {
    './helpers': helpers,
  },
);

// ========== test cases ==========

beforeEach(() => {
  mockedFiles = Object.create(null);
  mockedFiles[NPMRC] = '';
  mockedFiles[NRMRC] = '';
});

test('onList', async t => {
  const name = 'npm';
  const registry = REGISTRIES[name][REGISTRY];
  writeFileSync(NPMRC, ini.stringify({ registry }));
  const output = await stdout.inspectAsync(actions.onList);
  const match = chalk.green.bold('* ') + name;
  t.ok(output.some(each => each.includes(match)), 'can print current registry in use with \'*\' symbol prefix');
  t.end();
});

test('onCurrent', async t => {
  const name = 'npm';
  const registry = REGISTRIES[name][REGISTRY];
  writeFileSync(NPMRC, ini.stringify({ registry }));
  const [output1] = await stdout.inspectAsync(actions.onCurrent);
  const [output2] = await stdout.inspectAsync(() => actions.onCurrent({ showUrl: true }));
  writeFileSync(NPMRC, ini.stringify({ registry: 'unknown registry' }));
  const [output3] = await stdout.inspectAsync(actions.onCurrent);
  t.ok(output1.includes(name), 'can print current registry name in use');
  t.ok(output2.includes(registry), 'can print current registry url in use by passing --show-url option');
  t.ok(output3.includes('not included'), 'can print tips when using unknown registry');
  t.end();
});

test('onUse', async t => {
  const npm = 'npm';
  const [output] = await stdout.inspectAsync(() => actions.onUse(npm));
  const { registry } = ini.parse(readFileSync(NPMRC));
  t.ok(registry === REGISTRIES.npm.registry, 'can change current registry in use');
  t.ok(output.includes(`The registry has been changed to '${npm}'`), 'can print tip after use new registry');
  t.end();
});

test('onDelete', async t => {
  const customRegistries = {
    name1: { registry: 'https://registry.name1.com/' },
    name2: { registry: 'https://registry.name2.com/' },
  };
  writeFileSync(NRMRC, ini.stringify(customRegistries));
  writeFileSync(NPMRC, ini.stringify({ registry: customRegistries.name1.registry }));
  await actions.onDelete('name1');
  t.ok(!Object.keys(ini.parse(readFileSync(NRMRC))).includes('name1'), 'can delete registry name');
  t.equal(ini.parse(readFileSync(NPMRC)).registry, REGISTRIES.npm.registry, 'can set npm registry as default after delete current registry in use');
  t.end();
});
