const { suite } = require('uvu');
const coffee = require('coffee');
const cli = suite('cat');

const registryName = 'testRegistry'
const registryDestination = 'https://t.test.org/';
const addLog = new RegExp(`add registry ${registryName} success`, 'g');
const delLog = new RegExp(`delete registry ${registryName} success`, 'g');

const isWin = process.platform === 'win32';

cli('nrm ls contain taobao regisitery', async () => {
  await coffee.spawn('nrm', ['ls'], {
    shell: isWin
  })
    .expect('stdout', /taobao/g)
    .expect('code', 0)
    .end();
});

cli('nrm use taobao && nrm current is taobao', async () => {
  await coffee.spawn('nrm', ['use taobao'], {
    shell: isWin
  });

  await coffee.spawn('nrm', ['current'], {
    shell: isWin
  })
    .expect('stdout', /taobao/g)
    .expect('code', 0)
    .end();
});

cli('nrm add customRegistry', async () => {
  await coffee.spawn('nrm', [`add ${registryName} ${registryDestination}`], {
    shell: isWin
  })
    .expect('stdout', addLog)
    .expect('code', 0)
    .end();
});

cli('nrm del customRegistry', async () => {
  await coffee.spawn('nrm', [`del ${registryName}`], {
    shell: isWin
  })
    .expect('stdout', delLog)
    .debug()
    .expect('code', 0)
    .end();
});

cli.run();
