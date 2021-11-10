const { suite } = require('uvu');
const assert = require('uvu/assert');

const hello = suite('hello');

const target = 'hello';

hello('should be hello', () => {
  assert.is(target, 'hello');
});

hello.run();
