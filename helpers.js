const fs = require('fs');
const ini = require('ini');
const chalk = require('chalk');
const process = require('./process');

const { NRMRC, NPMRC, REGISTRY, REGISTRIES } = require('./constants');

async function readFile(file) {
  return new Promise(resolve => {
    if (!fs.existsSync(file)) {
      resolve({});
    } else {
      try {
        const content = ini.parse(fs.readFileSync(file, 'utf-8'));
        resolve(content);
      } catch (error) {
        exit(error);
      }
    }
  });
}

async function writeFile(path, content) {
  return new Promise(resolve => {
    try {
      fs.writeFileSync(path, ini.stringify(content));
      resolve();
    } catch (error) {
      exit(error);
    }
  });
}

function padding(message = '', before = 1, after = 1) {
  return new Array(before).fill(' ').join('') + message + new Array(after).fill(' ').join('');
}

function printSuccess(message) {
  console.log(chalk.bgGreenBright(padding('SUCCESS')) + ' ' + message);
}

function printError(error) {
  console.error(chalk.bgRed(padding('ERROR')) + ' ' + chalk.red(error));
}

function printMessages(messages) {
  for (const message of messages) {
    console.log(message);
  }
}

function geneDashLine(message, length) {
  const finalMessage = new Array(Math.max(2, length - message.length + 2)).join('-');
  return padding(chalk.dim(finalMessage));
}

function isLowerCaseEqual(str1, str2) {
  if (str1 && str2) {
    return str1.toLowerCase() === str2.toLowerCase();
  } else {
    return !str1 && !str2;
  }
}

async function getCurrentRegistry() {
  const npmrc = await readFile(NPMRC);
  return npmrc[REGISTRY];
}

async function getRegistries() {
  const customRegistries = await readFile(NRMRC);
  return Object.assign({}, REGISTRIES, customRegistries);
}

async function isRegistryNotFound(name, printErr = true) {
  const registries = await getRegistries();
  if (!Object.keys(registries).includes(name)) {
    printErr && printError(`The registry '${name}' is not found.`);
    return true;
  }
  return false;
}

async function isInternalRegistry(name, handle) {
  if (Object.keys(REGISTRIES).includes(name)) {
    handle && printError(`You cannot ${handle} the nrm internal registry.`);
    return true;
  }
  return false;
}

function exit(error) {
  error && printError(error);
  process.exit(1);
}

module.exports = {
  exit,
  geneDashLine,
  printError,
  printSuccess,
  printMessages,
  isLowerCaseEqual,
  readFile,
  writeFile,
  getRegistries,
  getCurrentRegistry,
  isRegistryNotFound,
  isInternalRegistry,
};
