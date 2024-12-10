import checkbox from '@inquirer/checkbox';
import select from '@inquirer/select';
import chalk from 'chalk';
import open from 'open';
import { fetch } from 'undici';
import {
  ALWAYS_AUTH,
  AUTH,
  EMAIL,
  HOME,
  NPMRC,
  NRMRC,
  REGISTRY,
  REPOSITORY,
} from './constants';
import {
  exit,
  geneDashLine,
  getCurrentRegistry,
  getRegistries,
  isInternalRegistry,
  isLowerCaseEqual,
  isRegistryNotFound,
  printMessages,
  printSuccess,
  readFile,
  writeFile,
} from './helpers';

export async function onList() {
  const currentRegistry = await getCurrentRegistry();
  const registries = await getRegistries();

  const keys = Object.keys(registries);
  const length = Math.max(...keys.map((key) => key.length)) + 3;

  const messages = keys.map((key) => {
    const registry = registries[key];
    const prefix = isLowerCaseEqual(registry[REGISTRY], currentRegistry)
      ? chalk.green.bold('* ')
      : '  ';
    return prefix + key + geneDashLine(key, length) + registry[REGISTRY];
  });

  printMessages(messages);
}

export async function onCurrent({ showUrl }: { showUrl: boolean }) {
  const currentRegistry = await getCurrentRegistry();
  const registries = await getRegistries();

  const matchedRegistry = Object.entries(registries).find(([_name, registry]) =>
    isLowerCaseEqual(registry[REGISTRY], currentRegistry),
  );

  // not find equal registry
  if (!matchedRegistry) {
    printMessages([
      `Your current registry(${currentRegistry}) is not included in the nrm registries.`,
      `Use the ${chalk.green(
        'nrm add <registry> <url> [home]',
      )} command to add your registry.`,
    ]);
    return;
  }

  const [name, registry] = matchedRegistry;
  printMessages([
    `You are using ${chalk.green(
      showUrl ? registry[REGISTRY] : name,
    )} registry.`,
  ]);
}

export async function onUse(name: string) {
  const registries = await getRegistries();
  let alias = name;

  // if alias is undefined, select the registry alias from list
  if (alias === undefined) {
    alias = await select<string>({
      message: 'Please select the registry you want to use',
      choices: Object.keys(registries),
      pageSize: 10,
    });
  }

  if (await isRegistryNotFound(alias)) {
    return;
  }

  const registry = registries[alias];
  const npmrc = await readFile(NPMRC);
  await writeFile(NPMRC, Object.assign(npmrc, registry));

  printSuccess(`The registry has been changed to '${alias}'.`);
}

export async function onDelete(name: string | undefined) {
  const customRegistries = await readFile(NRMRC);

  const deleteKeys: string[] = [];
  if (name) {
    deleteKeys.push(name);
  }

  const choices = Object.keys(customRegistries);
  if (name === undefined && !choices.length) {
    printMessages(['No any custom registries can be deleted.']);
    return;
  }

  if (name === undefined) {
    const selectedKeys = await checkbox<string>({
      message: 'Please select the registries you want to delete',
      choices,
    });
    deleteKeys.push(...selectedKeys);
  }

  for (const key of deleteKeys) {
    if (
      (await isRegistryNotFound(key)) ||
      (await isInternalRegistry(key, 'delete'))
    ) {
      continue;
    }

    const registry = customRegistries[key];
    delete customRegistries[key];
    await writeFile(NRMRC, customRegistries);
    printSuccess(`The registry '${key}' has been deleted successfully.`);

    const currentRegistry = await getCurrentRegistry();
    if (currentRegistry === registry[REGISTRY]) {
      await onUse('npm');
    }
  }
}

export async function onAdd(name: string, url: string, home?: string) {
  const registries = await getRegistries();
  const registryNames = Object.keys(registries);
  const registryUrls = registryNames.map((name) => registries[name][REGISTRY]);
  if (
    registryNames.includes(name) ||
    registryUrls.some((eachUrl) => isLowerCaseEqual(eachUrl, url))
  ) {
    return exit(
      'The registry name or url is already included in the nrm registries. Please make sure that the name and url are unique.',
    );
  }

  const newRegistry: Record<string, string | undefined> = {};
  newRegistry[REGISTRY] = /\/$/.test(url) ? url : `${url}/`;
  if (home) {
    newRegistry[HOME] = home;
  }
  const customRegistries = await readFile(NRMRC);
  const newCustomRegistries = Object.assign(customRegistries, {
    [name]: newRegistry,
  });
  await writeFile(NRMRC, newCustomRegistries);
  printSuccess(
    `Add registry ${name} success, run ${chalk.green(
      `nrm use ${name}`,
    )} command to use ${name} registry.`,
  );
}

export async function onLogin(
  name: string,
  base64: string,
  {
    alwaysAuth,
    username,
    password,
    email,
  }: { alwaysAuth: boolean; username: string; password: string; email: string },
) {
  if (
    (await isRegistryNotFound(name)) ||
    (await isInternalRegistry(name, 'set authorization information of'))
  ) {
    return;
  }

  const customRegistries = await readFile(NRMRC);
  const registry = customRegistries[name];
  if (base64) {
    registry[AUTH] = base64;
  } else if (username && password) {
    registry[AUTH] = Buffer.from(`${username}:${password}`).toString('base64');
  } else {
    return exit(
      'Authorization information in base64 format or username & password is required',
    );
  }

  if (alwaysAuth) {
    registry[ALWAYS_AUTH] = true;
  }

  if (email) {
    registry[EMAIL] = email;
  }

  Object.assign(customRegistries, { [name]: registry });
  await writeFile(NRMRC, customRegistries);
  printSuccess(
    `Set the authorization information of the registry '${name}' success.`,
  );

  const currentRegistry = await getCurrentRegistry();
  if (currentRegistry === registry[REGISTRY]) {
    const npmrc = await readFile(NPMRC);
    await writeFile(
      NPMRC,
      Object.assign(npmrc, {
        [AUTH]: registry[AUTH],
        [ALWAYS_AUTH]: registry[ALWAYS_AUTH],
        [EMAIL]: registry[EMAIL],
      }),
    );
  }
}

export async function onSetRepository(name: string, repo: string) {
  if (
    (await isRegistryNotFound(name)) ||
    (await isInternalRegistry(name, 'set repository of'))
  ) {
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
    printSuccess('Set repository attribute of npmrc successfully');
  }
}

export async function onSetScope(scopeName: string, url: string) {
  const scopeRegistryKey = `${scopeName}:${REGISTRY}`;
  const npmrc = await readFile(NPMRC);
  Object.assign(npmrc, { [scopeRegistryKey]: url });
  await writeFile(NPMRC, npmrc);
  printSuccess(`Set scope '${scopeRegistryKey}=${url}' success.`);
}

export async function onDeleteScope(scopeName: string) {
  const scopeRegistryKey = `${scopeName}:${REGISTRY}`;
  const npmrc = await readFile(NPMRC);
  if (npmrc[scopeRegistryKey]) {
    delete npmrc[scopeRegistryKey];
    await writeFile(NPMRC, npmrc);
    printSuccess(`Delete scope '${scopeRegistryKey}' success.`);
  }
}

export async function onSetAttribute(
  name: string,
  { attr, value }: { attr: string; value: string },
) {
  if (
    (await isRegistryNotFound(name)) ||
    (await isInternalRegistry(name, 'set attribute of'))
  ) {
    return;
  }

  if (REPOSITORY === attr) {
    return exit(
      `Use the ${chalk.green(
        'nrm set-hosted-repo <name> <repo>',
      )} command to set repository.`,
    );
  }
  const customRegistries = await readFile(NRMRC);
  const registry = customRegistries[name];
  Object.assign(registry, { [attr]: value });
  await writeFile(NRMRC, customRegistries);
  printSuccess(
    `Set attribute '${attr}=${value}' of the registry '${name}' successfully.`,
  );

  const currentRegistry = await getCurrentRegistry();
  if (currentRegistry === registry[REGISTRY]) {
    const npmrc = await readFile(NPMRC);
    await writeFile(NPMRC, Object.assign(npmrc, { [attr]: value }));
  }
}

export async function onRename(name: string, newName: string) {
  if (
    (await isRegistryNotFound(name)) ||
    (await isInternalRegistry(name, 'rename'))
  ) {
    return;
  }

  if (name === newName) {
    return exit('The names cannot be the same.');
  }

  if (!(await isRegistryNotFound(newName, false))) {
    return exit(`The new registry name '${newName}' is already exist.`);
  }
  const customRegistries = await readFile(NRMRC);
  customRegistries[newName] = JSON.parse(
    JSON.stringify(customRegistries[name]),
  );
  delete customRegistries[name];
  await writeFile(NRMRC, customRegistries);
  printSuccess(`The registry '${name}' has been renamed to '${newName}'.`);
}

export async function onHome(name: string, browser?: string) {
  if (await isRegistryNotFound(name)) {
    return;
  }

  const registries = await getRegistries();
  if (!registries[name][HOME]) {
    return exit(`The homepage of registry '${name}' is not found.`);
  }
  open(
    registries[name][HOME],
    browser ? { app: { name: browser } } : undefined,
  );
}

export async function onTest(target?: string) {
  const registries = await getRegistries();
  const timeout = 5000;

  if (target && (await isRegistryNotFound(target))) {
    exit();
  }

  const sources = target ? { [target]: registries[target] } : registries;

  const results = await Promise.all(
    Object.keys(sources).map(async (name) => {
      const { registry } = sources[name];
      const start = Date.now();
      let status = false;
      let isTimeout = false;
      try {
        const response = await fetch(`${registry}nrm`, {
          signal: AbortSignal.timeout(timeout),
        });
        status = response.ok;
      } catch (error: any) {
        isTimeout = error.name === 'TimeoutError';
      }
      return {
        name,
        registry,
        success: status,
        time: Date.now() - start,
        isTimeout,
      };
    }),
  );

  const [fastest] = results
    .filter((each) => each.success)
    .map((each) => each.time)
    .sort((a, b) => a - b);

  const messages: string[] = [];
  const currentRegistry = await getCurrentRegistry();
  const errorMsg = chalk.red(
    ' (Fetch error, if this is your private registry, please ignore)',
  );
  const timeoutMsg = chalk.yellow(` (Fetch timeout over ${timeout} ms)`);
  const length = Math.max(...Object.keys(sources).map((key) => key.length)) + 3;

  for (const { registry, success, time, name, isTimeout } of results) {
    const isFastest = time === fastest;
    const prefix = registry === currentRegistry ? chalk.green('* ') : '  ';
    let suffix =
      isFastest && !target
        ? chalk.bgGreenBright(`${time} ms`)
        : isTimeout
          ? 'timeout'
          : `${time} ms`;
    if (!success) {
      suffix += isTimeout ? timeoutMsg : errorMsg;
    }
    messages.push(prefix + name + geneDashLine(name, length) + suffix);
  }

  printMessages(messages);

  return messages;
}
