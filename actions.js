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
  isRegistryNotFound,
  isInternalRegistry,
} = require('./helpers');

const { NRMRC, NPMRC, AUTH, EMAIL, ALWAYS_AUTH, REPOSITORY, REGISTRY, HOME } = require('./constants');

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
  if (await isRegistryNotFound(name)) {
    return;
  }

  const registries = await getRegistries();
  const registry = registries[name];
  const npmrc = await readFile(NPMRC);
  await writeFile(NPMRC, Object.assign(npmrc, registry));

  printSuccess(`The registry has been changed to '${name}'.`);
}

async function onDelete(name) {
  if (await isRegistryNotFound(name) || await isInternalRegistry(name, 'delete')) {
    return;
  }

  const customRegistries = await readFile(NRMRC);
  const registry = customRegistries[name];
  delete customRegistries[name];
  await writeFile(NRMRC, customRegistries);
  printSuccess(`The registry '${name}' has been deleted successfully.`);

  const currentRegistry = await getCurrentRegistry();
  if (currentRegistry === registry[REGISTRY]) {
    await onUse('npm');
  }
}

async function onAdd(name, url, home) {
  const registries = await getRegistries();
  const registryNames = Object.keys(registries);
  const registryUrls = registryNames.map(name => registries[name][REGISTRY]);
  if (registryNames.includes(name) || registryUrls.some(eachUrl => isLowerCaseEqual(eachUrl, url))) {
    return exit('The registry name or url is already included in the nrm registries. Please make sure that the name and url are unique.');
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
  if (await isRegistryNotFound(name) || await isInternalRegistry(name, 'set authorization information of')) {
    return;
  }

  const customRegistries = await readFile(NRMRC);
  const registry = customRegistries[name];
  if (base64) {
    registry[AUTH] = base64;
  } else if (username && password) {
    registry[AUTH] = Buffer.from(`${username}:${password}`).toString('base64');
  } else {
    return exit('Authorization information in base64 format or username & password is required');
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
  if (await isRegistryNotFound(name) || await isInternalRegistry(name, 'set repository of')) {
    return;
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
    printSuccess(`Set repository attribute of npmrc successfully`);
  }
}

async function onSetScope(scopeName, url) {
  const scopeRegistryKey = `${scopeName}:${REGISTRY}`;
  const npmrc = await readFile(NPMRC);
  Object.assign(npmrc, { [scopeRegistryKey]: url });
  await writeFile(NPMRC, npmrc);
  printSuccess(`Set scope '${scopeRegistryKey}=${url}' success.`);
}

async function onDeleteScope(scopeName) {
  const scopeRegistryKey = `${scopeName}:${REGISTRY}`;
  const npmrc = await readFile(NPMRC);
  if (npmrc[scopeRegistryKey]) {
    delete npmrc[scopeRegistryKey];
    await writeFile(NPMRC, npmrc);
    printSuccess(`Delete scope '${scopeRegistryKey}' success.`);
  }
}

async function onSetAttribute(name, { attr, value }) {
  if (await isRegistryNotFound(name) || await isInternalRegistry(name, 'set attribute of')) {
    return;
  }

  if (REPOSITORY === attr) {
    return exit(`Use the ${chalk.green('nrm set-hosted-repo <name> <repo>')} command to set repository.`);
  }
  const customRegistries = await readFile(NRMRC);
  const registry = customRegistries[name];
  Object.assign(registry, { [attr]: value });
  await writeFile(NRMRC, customRegistries);
  printSuccess(`Set attribute '${attr}=${value}' of the registry '${name}' successfully.`);

  const currentRegistry = await getCurrentRegistry();
  if (currentRegistry === registry[REGISTRY]) {
    const npmrc = await readFile(NPMRC);
    await writeFile(NPMRC, Object.assign(npmrc, { [attr]: value }));
  }
}

async function onRename(name, newName) {
  if (await isRegistryNotFound(name) || await isInternalRegistry(name, 'rename')) {
    return;
  }
  if (name === newName) {
    return exit('The names cannot be the same.');
  }

  if (!await isRegistryNotFound(newName, false)) {
    return exit(`The new registry name '${newName}' is already exist.`);
  }
  const customRegistries = await readFile(NRMRC);
  customRegistries[newName] = JSON.parse(JSON.stringify(customRegistries[name]));
  delete customRegistries[name];
  await writeFile(NRMRC, customRegistries);
  printSuccess(`The registry '${name}' has been renamed to '${newName}'.`);
}

async function onHome(name, browser) {
  if (await isRegistryNotFound(name)) {
    return;
  }

  const registries = await getRegistries();
  if (!registries[name][HOME]) {
    return exit(`The homepage of registry '${name}' is not found.`);
  }
  open(registries[name][HOME], browser ? { app: { name: browser } } : undefined);
}

async function onTest(target) {
  const registries = await getRegistries();
  const timeout = 5000;

  if (target && await isRegistryNotFound(target)) {
    return exit();
  }

  const sources = target ? { [target]: registries[target] } : registries;

  const results = await Promise.all(Object.keys(sources).map(async name => {
    const { registry } = sources[name];
    const start = Date.now();
    let status = false;
    let isTimeout = false;
    try {
      const response = await fetch(registry + 'nrm', { timeout });
      status = response.ok;
    } catch (error) {
      isTimeout = error.type === 'request-timeout';
    }
    return {
      name,
      registry,
      success: status,
      time: Date.now() - start,
      isTimeout
    };
  }));

  const [fastest] = results.filter(each => each.success).map(each => each.time).sort((a, b) => a - b);

  const messages = [];
  const currentRegistry = await getCurrentRegistry();
  const errorMsg = chalk.red(' (Fetch error, if this is your private registry, please ignore)');
  const timeoutMsg = chalk.yellow(` (Fetch timeout over ${timeout} ms)`);
  const length = Math.max(...Object.keys(sources).map(key => key.length)) + 3;
  results.forEach(({ registry, success, time, name, isTimeout }) => {
    const isFastest = time === fastest;
    const prefix = registry === currentRegistry ? chalk.green('* ') : '  ';
    let suffix = (isFastest && !target) ? chalk.bgGreenBright(time + ' ms') : isTimeout ? 'timeout' : `${time} ms`;
    if (!success) {
      suffix += isTimeout ? timeoutMsg : errorMsg;
    }
    messages.push(prefix + name + geneDashLine(name, length) + suffix);
  });
  printMessages(messages);
  return messages;
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
