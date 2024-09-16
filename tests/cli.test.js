const coffee = require('coffee');
const open = require('open');
const chalk = require('chalk');

const { onHome, onTest } = require('.././actions.js');

const isWin = process.platform === 'win32';

jest.setTimeout(20000);
jest.mock('open', () => {
  return jest.fn(() => {
    console.log('browser opened');
  });
});

jest.mock('node-fetch', () => {
  return jest.fn(url => {
    return new Promise(resolve => {
      setTimeout(
        () => resolve({ ok: !url.includes('error.com') }),
        (Math.random() + 1)*1000,
      );
    });
  });
});

beforeAll(async () => {
  const { stdout } = await coffee.spawn('nrm', ['-V'], { shell: isWin }).end();
  __NRM_VERSION__ = stdout ? stdout : null;
  await coffee.spawn('npm', ['link'], { shell: isWin }).end();
});

afterAll(async () => {
  await coffee.spawn('npm', ['unlink', 'nrm', '-g'], { shell: isWin }).end();
  if(__NRM_VERSION__ !== null) {
    await coffee.spawn('npm', [`install -g nrm@${__NRM_VERSION__}`], { shell: isWin }).end();
  }
});

it('nrm ls', async () => {
  await coffee.spawn('nrm', ['use', 'cnpm'], { shell: isWin })
    .expect('stdout', /The registry has been changed to 'cnpm'/g)
    .expect('code', 0)
    .end();

  const { stdout, code } = await coffee.spawn('nrm', ['ls'], { shell: isWin }).end();

  const match = chalk.green.bold('* ') + 'cnpm';
  expect(stdout.includes(match)).toBe(true);
  expect(code).toBe(0);
});

it('nrm use <registry>', async () => {
  await coffee.spawn('nrm', ['use', 'cnpm'], { shell: isWin })
    .expect('stdout', /The registry has been changed to 'cnpm'/g)
    .expect('code', 0)
    .end();
});

it('nrm current', async () => {
  await coffee.spawn('nrm', ['use', 'cnpm'], { shell: isWin })
    .expect('stdout', /The registry has been changed to 'cnpm'/g)
    .expect('code', 0)
    .end();

  await coffee.spawn('nrm', ['current'], { shell: isWin })
    .expect('stdout', /cnpm/g)
    .expect('code', 0)
    .end();
});

describe('nrm command which needs to add a custom registry', () => {
  const customName = 'customName';
  const url = 'https://registry.error.com/';

  beforeEach(async () => {
    /* the globalVariable in jest.config.js */
    __REGISTRY__ = customName;

    await coffee.spawn('nrm', ['add', `${__REGISTRY__}`, `${url}`], { shell: isWin })
      .expect('stdout', /success/g)
      .expect('code', 0)
      .end();
  });

  afterEach(async () => {
    await coffee.spawn('nrm', ['del',`${__REGISTRY__}`], { shell: isWin })
      .expect('stdout', /has been deleted successfully/g)
      .expect('code', 0)
      .end();
  });

  it('nrm rename', async () => {
    const newName = 'newName';
    __REGISTRY__ = newName;
    const match = new RegExp(`The registry '${customName}' has been renamed to '${newName}'`, 'g');

    await coffee.spawn('nrm', ['rename',`${customName}`, `${newName}`], { shell: isWin })
      .expect('stdout', match)
      .expect('code', 0)
      .end();
  });

  it('nrm set <name>', async () => {
    const attr = 'attr';
    const value = 'value';

    await coffee.spawn('nrm', ['set', `${__REGISTRY__}`, '-a', `${attr}`, '-v', `${value}`], { shell: isWin })
      .expect('stdout', /successfully/g)
      .expect('code', 0)
      .end();
  });

  it('nrm test [registry]', async () => {
    const results = await onTest();
    expect(results.every(ele => /\d+\sms/.test(ele))).toBe(true);
    expect(results.some(ele => ele.includes('*'))).toBe(true);
    expect(results.some(ele => ele.includes('please ignore'))).toBe(true);
  });

  it('nrm set-scope <scopeName> <url>, del-scope <scopeName>', async () => {
    const scopeName = 'nrm';
    const url = 'https://scope.example.org';

    await coffee.spawn('nrm', ['set-scope',`${scopeName}`, `${url}`], { shell: isWin })
      .expect('stdout', /success/g)
      .expect('code', 0)
      .end();

    await coffee.spawn('nrm', ['del-scope',`${scopeName}`], { shell: isWin })
      .expect('stdout', /success/g)
      .expect('code', 0)
      .end();
  });

  it('nrm set-hosted-repo <name> <repo>', async () => {
    const repo = 'repo';
    const match = new RegExp(`Set the repository of registry '${__REGISTRY__}' successfully`, 'g');

    await coffee.spawn('nrm', ['set-hosted-repo',`${__REGISTRY__}`, `${repo}`], { shell: isWin })
      .expect('stdout', match)
      .expect('code', 0)
      .end();
  });

  it('login <name> [base64]', async () => {
    const username = 'username';
    const password = 'password';

    await coffee.spawn('nrm', ['login',`${__REGISTRY__}`,'-u', `${username}`, '-p', `${password}`], { shell: isWin })
      .expect('stdout', /success/g)
      .expect('code', 0)
      .end();

    await coffee.spawn('nrm', ['login',`${__REGISTRY__}`], { shell: isWin })
      .expect('stderr', /Authorization information in base64 format or username & password is required/g)
      .end();
  });
});

it('nrm home <registry> [browser]', async () => {
  await onHome('cnpm');
  expect(open).toHaveBeenCalled();
});
