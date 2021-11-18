const ini = require('ini');
const tap = require('tap');
const chalk = require('chalk');
const { beforeEach, test, mock } = tap;
const { stdout, stderr } = require('test-console');

const { NPMRC, NRMRC, REGISTRY, REGISTRIES, AUTH, EMAIL, ALWAYS_AUTH, REPOSITORY } = require('./constants');

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
    exit: () => console.error('process exit'),
  },
});

const actions = mock('./actions.js', {
    './helpers': helpers,
    open: () => {
      console.log('browser opened');
    },
    'node-fetch': url => {
      return new Promise(resolve => {
        setTimeout(
          () => resolve({ ok: !url.includes('error.com') }),
          (Math.random() + 1)*1000,
        );
      });
    },
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
  await stdout.inspectAsync(() => actions.onDelete('name1'));
  t.ok(!Object.keys(ini.parse(readFileSync(NRMRC))).includes('name1'), 'can delete registry name');
  t.equal(ini.parse(readFileSync(NPMRC)).registry, REGISTRIES.npm.registry, 'can set npm registry as default after delete current registry in use');
  t.end();
});

test('onAdd', async t => {
  const name = 'custom name';
  const newName = 'new custom name';
  const home = 'https://home.example.com/';
  const registry = 'https://registry.example.com/';
  await stdout.inspectAsync(() => actions.onAdd(name, registry, home));
  t.ok(Object.keys(ini.parse(readFileSync(NRMRC))).includes(name), 'can add new registry');
  const [output1] = await stderr.inspectAsync(() => actions.onAdd(name, registry, home));
  t.ok(output1.includes('already included'), 'cannot add duplicate registry name');
  const [output2] = await stderr.inspectAsync(() => actions.onAdd(newName, registry, home));
  t.ok(output2.includes('already included'), 'cannot add duplicate registry url');
  t.end();
});

test('onLogin', async t => {
  const name = 'custom name';
  const username = 'username';
  const password = 'password';
  const email = 'https://email.com/';
  const extra = { alwaysAuth: true, email, username, password };
  const base64 = Buffer.from('nrm').toString('base64');
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry: 'https://registry.example.com/' } }));
  writeFileSync(NPMRC, ini.stringify({ registry: 'https://registry.example.com/' }));
  await stdout.inspectAsync(() => actions.onLogin(name, base64, extra));
  const registry1 = ini.parse(readFileSync(NRMRC))[name];
  t.ok(
    [registry1[AUTH] === base64, registry1[EMAIL] === email, registry1[ALWAYS_AUTH]].every(Boolean),
    'can set _auth, email and always_auth attributes of registry',
  );
  const npmrc = ini.parse(readFileSync(NPMRC));
  t.same(registry1, npmrc, 'can set _auth, email and always_auth attributes of npmrc');
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry: 'https://registry.example.com/' } }));
  await stdout.inspectAsync(() => actions.onLogin(name, undefined, extra));
  const registry2 = ini.parse(readFileSync(NRMRC))[name];
  t.ok(
    registry2[AUTH] === Buffer.from(`${username}:${password}`).toString('base64'),
    'can set \'username:password\' as auth attribute of registry with base64 format',
  );
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry: 'https://registry.example.com/' } }));
  const [output] = await stderr.inspectAsync(() => actions.onLogin(name, undefined, {}));
  t.ok(
    output.includes('username & password is required'),
    'can print error message when base64 or username & password is all missing',
  );
  t.end();
});

test('onSetRepository', async t => {
  const name = 'custom name';
  const repo = 'https://github.com/';
  const registry = 'https://registry.example.com/';
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry } }));
  writeFileSync(NPMRC, ini.stringify({ registry }));
  await stdout.inspectAsync(() => actions.onSetRepository(name, repo));
  t.ok(ini.parse(readFileSync(NRMRC))[name][REPOSITORY] === repo, 'can set repository attribute of registry');
  t.ok(ini.parse(readFileSync(NPMRC))[REPOSITORY] === repo, 'can set repository attribute of npmrc');
  t.end();
});

test('onSetScope', async t => {
  const name = 'nrm';
  const registry = 'https://registry.example.com/';
  await stdout.inspectAsync(() => actions.onSetScope(name, registry));
  t.ok(ini.parse(readFileSync(NPMRC))[`${name}:${REGISTRY}`] === registry, 'can set scope of npmrc');
  t.end();
});

test('onDeleteScope', async t => {
  const name = 'nrm';
  const scopeKey = `${name}:${REGISTRY}`;
  const registry = 'https://registry.example.com/';
  writeFileSync(NPMRC, ini.stringify({ [scopeKey]: registry }));
  await stdout.inspectAsync(() => actions.onDeleteScope(name));
  t.ok(ini.parse(readFileSync(NPMRC))[scopeKey] === undefined, 'can delete scope of npmrc');
  t.end();
});

test('onSetAttributes', async t => {
  const name = 'nrm';
  const attr = 'attr';
  const value = 'value';
  const registry = 'https://registry.example.com/';
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry } }));
  writeFileSync(NPMRC, ini.stringify({ registry }));
  await stdout.inspectAsync(() => actions.onSetAttribute(name, { attr, value }));
  const target = ini.parse(readFileSync(NRMRC))[name];
  const npmrc = ini.parse(readFileSync(NPMRC));
  t.ok(target[attr] === value, 'can set attribute of registry');
  t.ok(npmrc[attr] === value, 'can set attribute of npmrc');
  const [, exit] = await stderr.inspectAsync(() => actions.onSetAttribute(name, { attr: REPOSITORY }));
  t.ok(exit.includes('process exit'), 'cannot set repository attribute by this command');
  t.end();
});

test('onRename', async t => {
  const name = 'name';
  const newName = 'newName';
  const registry = 'https://registry.example.com/';
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry } }));
  await stdout.inspectAsync(() => actions.onRename(name, newName));
  t.same(ini.parse(readFileSync(NRMRC))[newName], { registry }, 'cannot rename registry');
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry }, [newName]: { registry } }));
  const [output1] = await stderr.inspectAsync(() => actions.onRename(name, name));
  const [output2] = await stderr.inspectAsync(() => actions.onRename(name, newName));
  t.ok(output1.includes('cannot be the same'), 'the name cannot be the same');
  t.ok(output2.includes('is already exist'), 'cannot rename an existing name');
  t.end();
});

test('onHome', async t => {
  const name = 'name';
  const home = 'https://home.com/';
  const registry = 'https://registry.example.com/';
  writeFileSync(NRMRC, ini.stringify({ [name]: { home, registry } }));
  const [output1] = await stdout.inspectAsync(() => actions.onHome(name));
  t.ok(output1.includes('browser opened'), 'can open homepage of registry using default browser');
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry } }));
  const [output2] = await stderr.inspectAsync(() => actions.onHome(name));
  t.ok(output2.includes('not found'), 'cannot open homepage of registry if missing');
  t.end();
});

test('onTest', async t => {
  const name = 'name';
  const registry = 'https://registry.error.com/';
  writeFileSync(NPMRC, ini.stringify({ registry }));
  writeFileSync(NRMRC, ini.stringify({ [name]: { registry } }));
  const output1 = await stdout.inspectAsync(() => actions.onTest());
  const [output2] = await stderr.inspectAsync(() => actions.onTest('unknown'));
  t.ok(output1.some(o => o.includes(chalk.green('* '))), 'can show current registry');
  t.ok(output1.every(o => /\d+\sms/.test(o)), 'can show network speed of each registry');
  t.ok(output1.some(o => o.includes(chalk.bgGreenBright(o.match(/\d+\sms/)[0]))), 'can show the fastest registry');
  t.ok(output1.some(o => o.includes('please ignore')), 'can show error tip when fetch failed');
  t.ok(output2.includes('is not found'), 'print error message if registry not found');
  t.end();
});
