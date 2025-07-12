import { NPMRC } from '../src/constants';
import { readFile, writeFile } from '../src/helpers';

export async function setup() {
  const npmrc = await readFile(NPMRC);
  return async function teardown() {
    if (npmrc) {
      await writeFile(NPMRC, npmrc);
    }
  };
}
