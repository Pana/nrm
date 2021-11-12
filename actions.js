const open = require('open');
const chalk = require('chalk');
const fetch = require('node-fetch');

const {
  exit,
  readFile,
  writeFile,
  geneDashLine,
  printMessages,
  printSuccess,
  getCurrentRegistry,
  getRegistries,
  isLowerCaseEqual,
} = require('./helpers');

const { NRMRC, NPMRC, AUTH, EMAIL, ALWAYS_AUTH, REGISTRIES, REPOSITORY, REGISTRY, HOME } = require('./constants');

async function onList() {
  const currentRegistry = await getCurrentRegistry();
  const registries = await getRegistries();
  const keys = Object.keys(registries);
  const length = Math.max(...keys.map(key => key.length)) + 3;

  const messages = keys.map(key => {
    const registry = registries[key];
    const prefix = isLowerCaseEqual(registry[REGISTRY], currentRegistry) ? chalk.green.bold('* ') : '  ';
    return prefix + key + geneDashLine(key, length) + registry[REGISTRY];
  });

  printMessages(messages);
}

async function onCurrent({ showUrl }) {
  const currentRegistry = await getCurrentRegistry();
  let usingUnknownRegistry = true;
  const registries = await getRegistries();
  for (const name in registries) {
    const registry = registries[name];
    if (isLowerCaseEqual(registry[REGISTRY], currentRegistry)) {
      usingUnknownRegistry = false;
      printMessages([`You are using ${chalk.green(showUrl ? registry[REGISTRY] : name)} registry.`]);
    }
  }
  if (usingUnknownRegistry) {
    printMessages([
      `Your current registry(${currentRegistry}) is not included in the nrm registries.`,
      `Use the ${chalk.green('nrm add <registry> <url> [home]')} command to add your registry.`,
    ]);
  }
}

async function onUse(name) {
  const registries = await getRegistries();
  if (!Object.keys(registries).includes(name)) {
    exit(`The registry '${name}' was not found.`);
  }

  const registry = registries[name];
  const npmrc = await readFile(NPMRC);
  await writeFile(NPMRC, Object.assign(npmrc, registry));

  printSuccess(`The registry has been changed to '${name}'.`);
}

async function onDelete(name) {
  const registries = await getRegistries();
  if (!Object.keys(registries).includes(name)) {
    exit(`The registry '${name}' is not included in the nrm registries.`);
  }
  if (Object.keys(REGISTRIES).includes(name)) {
    exit('You cannot delete the nrm internal registry.');
  }

  const customRegistries = await readFile(NRMRC);
  const registry = customRegistries[name];
  delete customRegistries[name];
  await writeFile(NRMRC, customRegistries);
  printSuccess(`The registry '${name}' has been deleted successfully.`);

  const currentRegistry = await getCurrentRegistry();
  if (currentRegistry === registry[REGISTRY]) {
    await onUse('npm');
    printSuccess(`And your current registry has been changed to 'npm'.`);
  }
}

async function onAdd(name, url, home) {
  const registries = await getRegistries();
  const registryNames = Object.keys(registries);
  const registryUrls = registryNames.map(name => registries[name][REGISTRY]);
  if (registryNames.includes(name) || registryUrls.some(eachUrl => isLowerCaseEqual(eachUrl, url))) {
    exit('The registry name or url is already included in the nrm registries. Please make sure that the name and url are unique.');
  }

  const newRegistry = {};
  newRegistry[REGISTRY] = /\/$/.test(url) ? url : url + '/';
  if (home) {
    newRegistry[HOME] = home;
  }
  const customRegistries = await readFile(NRMRC);
  const newCustomRegistries = Object.assign(customRegistries, { [name]: newRegistry });
  await writeFile(NRMRC, newCustomRegistries);
  printSuccess(`Add registry ${name} success, run ${chalk.green('nrm use ' + name)} command to use ${name} registry.`);
}

async function onLogin(name, base64, { alwaysAuth, username, password, email }) {
  const registries = await getRegistries();
  if (!Object.keys(registries).includes(name)) {
    exit(`The registry '${name}' is not included in the nrm registries.`);
  }
  if (Object.keys(REGISTRIES).includes(name)) {
    exit('You cannot set authorization information of the nrm internal registry.');
  }

  const customRegistries = await readFile(NRMRC);
  const registry = customRegistries[name];
  if (base64) {
    registry[AUTH] = base64;
  } else if (username && password) {
    registry[AUTH] = Buffer.from(`${username}:${password}`).toString('base64');
  } else {
    exit('Authorization information in base64 format or username & password is required');
  }

  if (alwaysAuth) {
    registry[ALWAYS_AUTH] = true;
  }

  if (email) {
    registry[EMAIL] = email;
  }

  Object.assign(customRegistries, { [name]: registry });
  await writeFile(NRMRC, customRegistries);
  printSuccess(`Set the authorization information of the registry '${name}' success.`);

  const currentRegistry = await getCurrentRegistry();
  if (currentRegistry === registry[REGISTRY]) {
    const npmrc = await readFile(NPMRC);
    await writeFile(NPMRC, Object.assign(npmrc, {
      [AUTH]: registry[AUTH],
      [ALWAYS_AUTH]: registry[ALWAYS_AUTH],
      [EMAIL]: registry[EMAIL],
    }));
  }
}

async function onSetRepository(name, repo) {
  const registries = await getRegistries();
  if (!Object.keys(registries).includes(name)) {
    exit(`The registry '${name}' is not included in the nrm registries.`);
  }
  if (Object.keys(REGISTRIES).includes(name)) {
    exit('You cannot set repository of the nrm internal registry.');
  }

  const customRegistries = await readFile(NRMRC);
  const registry = customRegistries[name];
  registry[REPOSITORY] = repo;
  await writeFile(NRMRC, customRegistries);
  printSuccess(`Set the ${REPOSITORY} of registry '${name}' successfully.`);

  const currentRegistry = await getCurrentRegistry();
  if (currentRegistry && registry[REGISTRY] === currentRegistry) {
    const npmrc = await readFile(NPMRC);
    Object.assign(npmrc, { [REPOSITORY]: repo });
    await writeFile(NPMRC, npmrc);
  }
}

async function onSetScope(scopeName, url) {
  const scopeRegistryKey = `${scopeName}:${REGISTRY}`;
  const npmrc = await readFile(NRMRC);
  Object.assign(npmrc, { [scopeRegistryKey]: url });
  await writeFile(NPMRC, npmrc);
  printSuccess(`Set scope '${scopeRegistryKey}=${url}' success.`);
}

async function onDeleteScope(scopeName) {
  const scopeRegistryKey = `${scopeName}:${REGISTRY}`;
  const npmrc = await readFile(NRMRC);
  if (npmrc[scopeRegistryKey]) {
    delete npmrc[scopeRegistryKey];
    await writeFile(NPMRC, npmrc);
    printSuccess(`Delete scope '${scopeRegistryKey}' success.`);
  }
}

async function onSetAttribute(name, { attr, value }) {
  const registries = await getRegistries();
  if (!Object.keys(registries).includes(name)) {
    exit(`The registry '${name}' is not included in the nrm registries.`);
  }
  if (Object.keys(REGISTRIES).includes(name)) {
    exit('You cannot set attribute of the nrm internal registry.');
  }
  if (REPOSITORY === attr) {
    exit(`Use the ${chalk.green('nrm set-hosted-repo <name> <repo>')} command to set repository.`);
  }
  const customRegistries = await readFile(NRMRC);
  const registry = customRegistries[name];
  Object.assign(registry, { [attr]: value });
  await writeFile(NRMRC, customRegistries);
  printSuccess(`Set attribute '${attr}=${value}' of the registry '${name}' successfully.`);

  const currentRegistry = await getCurrentRegistry();
  if (currentRegistry === registry[REGISTRY]) {
    const npmrc = await readFile(NPMRC);
    await writeFile(Object.assign(npmrc, { [attr]: value }));
  }
}

async function onRename(name, newName) {
  const registries = await getRegistries();
  if (!Object.keys(registries).includes(name)) {
    exit(`The registry '${name}' is not included in the nrm registries.`);
  }
  if (Object.keys(REGISTRIES).includes(name)) {
    exit('You cannot rename the nrm internal registry.');
  }
  if (name === newName) {
    exit('The names cannot be the same.');
  }
  if (Object.keys(registries).includes(newName)) {
    exit(`The new registry name '${newName}' is included in the nrm registries.`);
  }
  const customRegistries = await readFile(NRMRC);
  customRegistries[newName] = JSON.parse(JSON.stringify(customRegistries[name]));
  delete customRegistries[name];
  await writeFile(NRMRC, customRegistries);
  printSuccess(`The registry '${name}' has been renamed to '${newName}'.`);
}

async function onHome(name, browser) {
  const registries = await getRegistries();
  if (!Object.keys(registries).includes(name)) {
    exit(`The registry '${name}' is not included in the nrm registries.`);
  }
  if (!registries[name][HOME]) {
    exit(`The homepage of registry '${name}' is not found.`);
  }
  open(registries[name][HOME], browser ? { app: { name: browser } } : undefined);
}

async function onTest(target) {
  const registries = await getRegistries();

  let sources = registries;

  if (target) {
    if (!Object.keys(registries).includes(target)) {
      exit(`The registry '${target}' is not included in the nrm registries.`);
    }
    sources = { [target]: registries[target] };
  }

  const results = await Promise.all(Object.keys(sources).map(async name => {
    const { registry } = sources[name];
    const start = Date.now();
    const response = await fetch(registry + 'nrm', { timeout: 10000 });
    return {
      name,
      registry,
      success: response.ok,
      time: Date.now() - start,
    };
  }));

  const [fastest] = results.filter(each => each.success).map(each => each.time).sort((a, b) => a - b);

  const messages = [];
  const currentRegistry = await getCurrentRegistry();
  const length = Math.max(...Object.keys(sources).map(key => key.length)) + 3;
  results.forEach(({ registry, success, time, name }) => {
    const isFastest = time === fastest;
    const prefix = registry === currentRegistry ? chalk.green('* ') : '  ';
    const suffix = success
      ? isFastest
        ? chalk.bgGreenBright(time + ' ms')
        : time + ' ms'
      : chalk.bgRed('Fetch Error');
    messages.push(prefix + name + geneDashLine(name, length) + suffix);
  });
  printMessages(messages);
}

module.exports = {
  onList,
  onCurrent,
  onUse,
  onAdd,
  onDelete,
  onRename,
  onHome,
  onSetRepository,
  onSetScope,
  onDeleteScope,
  onSetAttribute,
  onTest,
  onLogin,
};
