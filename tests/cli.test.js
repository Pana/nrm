const { suite } = require('uvu');
const assert = require('uvu/assert');
const coffee = require('coffee');

const cli = suite('cat');

cli('#nrm ls contain taobao regisitery', async () => {
  await coffee.spawn('nrm', [ 'ls' ])
  .expect('stdout', /taobao/g)
  .expect('code', 0)
  .end();
});

cli.run();
