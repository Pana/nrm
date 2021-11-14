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

const actions = mock('./actions.js', {
  './helpers': mock('./helpers.js', {
    fs: {
      existsSync,
      readFileSync,
      writeFileSync,
    },
  }),
});

// ========== test cases ==========

beforeEach(() => {
  mockedFiles = Object.create(null);
  mockedFiles[NPMRC] = '';
  mockedFiles[NRMRC] = '';
});

test('onList', { silent: true }, t => {
  const registry = REGISTRIES.npm[REGISTRY];
  writeFileSync(NPMRC, ini.stringify({ registry }));
  const output = stdout.inspectSync(actions.onList);
  console.log(output);
  t.end();
});
