import { fork } from 'node:child_process';
import chalk from 'chalk';
import coffee from 'coffee';
import open from 'open';
import stripAnsi from 'strip-ansi';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { unlink } from 'node:fs/promises';
import path from 'node:path';
import { onHome, onTest } from '../src/actions';
import { NPMRC, NRMRC, REGISTRIES } from '../src/constants';
import { isUnicodeSupported, readFile, writeFile } from '../src/helpers';

const shouldUseMain = isUnicodeSupported();
const pointer = shouldUseMain ? '❯' : '>';
const radioOff = shouldUseMain ? '◯' : '( )';
const radioOn = shouldUseMain ? '◉' : '(*)';
const LOCAL_NRM = path.resolve(__dirname, '../dist/index.js');

vi.setConfig({
  testTimeout: 20000,
});
vi.mock('open', () => {
  return {
    default: vi.fn(() => console.log('browser opened')),
  };
});

vi.mock('undici', () => {
  return {
    fetch: vi.fn((url) => {
      return new Promise((resolve) => {
        setTimeout(
          () => resolve({ ok: !url.includes('error.com') }),
          (Math.random() + 1) * 1000,
        );
      });
    }),
  };
});

vi.stubGlobal('__NRM_VERSION__', null);
vi.stubGlobal('__REGISTRY__', null);

it('nrm ls', async () => {
  await coffee
    .fork(LOCAL_NRM, ['use', 'cnpm'])
    .expect('stdout', /The registry has been changed to 'cnpm'/g)
    .expect('code', 0)
    .end();

  const { stdout, code } = await coffee.fork(LOCAL_NRM, ['ls']).end();

  const match = `${chalk.green.bold('* ')}cnpm`;

  expect(stdout.includes(match)).toBe(true);
  expect(code).toBe(0);
});

it('nrm use <registry>', async () => {
  await coffee
    .fork(LOCAL_NRM, ['use', 'cnpm'])
    .expect('stdout', /The registry has been changed to 'cnpm'/g)
    .expect('code', 0)
    .end();
});

it('nrm use <registry> local', async () => {
  await coffee
    .fork(LOCAL_NRM, ['use', 'cnpm', 'local'])
    .expect('stdout', /The registry has been changed to 'cnpm'/g)
    .expect('code', 0)
    .end();

  const npmrc = await readFile(NPMRC);

  expect(npmrc.registry).toBe(REGISTRIES.cnpm.registry);

  await coffee
    .fork(LOCAL_NRM, ['current'])
    .expect('stdout', /cnpm/g)
    .expect('code', 0)
    .end();
});

it('nrm use <registry> local with user config', async () => {
  await writeFile(NPMRC, { abc: '123' });

  await coffee
    .fork(LOCAL_NRM, ['use', 'cnpm', 'local'])
    .expect('stdout', /The registry has been changed to 'cnpm'/g)
    .expect('code', 0)
    .end();

  const npmrc = await readFile(NPMRC);

  expect(npmrc.registry).toBe(REGISTRIES.cnpm.registry);
  expect(npmrc.abc).toBe('123');

  await coffee
    .fork(LOCAL_NRM, ['current'])
    .expect('stdout', /cnpm/g)
    .expect('code', 0)
    .end();
});

it('nrm use without argument', async () => {
  const { stdout } = fork(LOCAL_NRM, ['use'], { stdio: 'pipe' });

  const message = await new Promise((resolve) => {
    stdout?.on('data', (data) => {
      resolve(stripAnsi(data.toString()).trim());
    });
  });
  expect(
    message,
  ).toBe(`? Please select the registry you want to use (Use arrow keys)
${pointer} npm
  yarn
  tencent
  cnpm
  taobao
  npmMirror
  huawei`);
});

it('nrm current', async () => {
  await coffee
    .fork(LOCAL_NRM, ['use', 'cnpm'])
    .expect('stdout', /The registry has been changed to 'cnpm'/g)
    .expect('code', 0)
    .end();

  await coffee
    .fork(LOCAL_NRM, ['current'])
    .expect('stdout', /cnpm/g)
    .expect('code', 0)
    .end();
});

describe('nrm command which needs to add a custom registry', () => {
  const customName = 'customName';
  const url = 'https://registry.error.com/';
  let __REGISTRY__ = '';
  beforeEach(async () => {
    __REGISTRY__ = customName;

    await coffee
      .fork(LOCAL_NRM, ['add', `${__REGISTRY__}`, `${url}`])
      .expect('stdout', /success/g)
      .expect('code', 0)
      .end();
  });

  afterEach(async () => {
    await coffee
      .fork(LOCAL_NRM, ['del', `${__REGISTRY__}`])
      .expect('stdout', /has been deleted successfully/g)
      .expect('code', 0)
      .end();
  });

  it('nrm rename', async () => {
    const newName = 'newName';
    __REGISTRY__ = newName;
    const match = new RegExp(
      `The registry '${customName}' has been renamed to '${newName}'`,
      'g',
    );

    await coffee
      .fork(LOCAL_NRM, ['rename', `${customName}`, `${newName}`])
      .expect('stdout', match)
      .expect('code', 0)
      .end();
  });

  it('nrm set <name>', async () => {
    const attr = 'attr';
    const value = 'value';

    await coffee
      .fork(LOCAL_NRM, [
        'set',
        `${__REGISTRY__}`,
        '-a',
        `${attr}`,
        '-v',
        `${value}`,
      ])
      .expect('stdout', /successfully/g)
      .expect('code', 0)
      .end();
  });

  it('nrm test [registry]', async () => {
    const results = await onTest();
    expect(results.every((ele) => /\d+\sms/.test(ele))).toBe(true);
    expect(results.some((ele) => ele.includes('*'))).toBe(true);
    expect(results.some((ele) => ele.includes('please ignore'))).toBe(true);
  });

  it('nrm set-scope <scopeName> <url>, del-scope <scopeName>', async () => {
    const scopeName = 'nrm';
    const url = 'https://scope.example.org';

    await coffee
      .fork(LOCAL_NRM, ['set-scope', `${scopeName}`, `${url}`])
      .expect('stdout', /success/g)
      .expect('code', 0)
      .end();

    await coffee
      .fork(LOCAL_NRM, ['del-scope', `${scopeName}`])
      .expect('stdout', /success/g)
      .expect('code', 0)
      .end();
  });

  it('nrm set-hosted-repo <name> <repo>', async () => {
    const repo = 'repo';
    const match = new RegExp(
      `Set the repository of registry '${__REGISTRY__}' successfully`,
      'g',
    );

    await coffee
      .fork(LOCAL_NRM, ['set-hosted-repo', `${__REGISTRY__}`, `${repo}`])
      .expect('stdout', match)
      .expect('code', 0)
      .end();
  });

  it('login <name> [base64]', async () => {
    const username = 'username';
    const password = 'password';

    await coffee
      .fork(LOCAL_NRM, [
        'login',
        `${__REGISTRY__}`,
        '-u',
        `${username}`,
        '-p',
        `${password}`,
      ])
      .expect('stdout', /success/g)
      .expect('code', 0)
      .end();

    await coffee
      .fork(LOCAL_NRM, ['login', `${__REGISTRY__}`])
      .expect(
        'stderr',
        /Authorization information in base64 format or username & password is required/g,
      )
      .end();
  });
});

it('nrm home <registry> [browser]', async () => {
  await onHome('cnpm');
  expect(open).toHaveBeenCalled();
});

describe('nrm delete without argument (use keyword to select delete)', () => {
  const registries = [
    { name: 'test', url: 'http://localhost:3000' },
    { name: 'test1', url: 'http://localhost:3001' },
    { name: 'test2', url: 'http://localhost:3002' },
  ];
  beforeEach(async () => {
    for (const registry of registries) {
      await coffee
        .fork(LOCAL_NRM, ['add', `${registry.name}`, `${registry.url}`])
        .expect('stdout', /success/g)
        .expect('code', 0)
        .end();
    }
  });

  afterEach(async () => {
    await unlink(NRMRC);
  });

  it('nrm delete', async () => {
    const { stdout } = fork(LOCAL_NRM, ['del'], { stdio: 'pipe' });

    const message = await new Promise((resolve) => {
      stdout?.on('data', (data) => {
        resolve(stripAnsi(data.toString()).trim());
      });
    });

    expect(message).toMatchInlineSnapshot(`
      "? Please select the registries you want to delete (Press <space> to select, <a>
      to toggle all, <i> to invert selection, and <enter> to proceed)
      ${pointer}${radioOff} test
       ${radioOff} test1
       ${radioOff} test2"
    `);
  });

  it('nrm delete (with keyword input)', async () => {
    const { stdout, stdin } = fork(LOCAL_NRM, ['del'], { stdio: 'pipe' });
    stdin?.write('\u001b[B');

    const message = await new Promise((resolve) => {
      const m: string[] = [];
      stdout?.on('data', (data) => {
        m.push(stripAnsi(data.toString()).trim());
        // get the last output
        if (m.length === 2) {
          resolve(m[m.length - 1]);
        }
      });
    });

    expect(message).toMatchInlineSnapshot(`
      "? Please select the registries you want to delete (Press <space> to select, <a>
      to toggle all, <i> to invert selection, and <enter> to proceed)
       ${radioOff} test
      ${pointer}${radioOff} test1
       ${radioOff} test2"
    `);
  });
});
