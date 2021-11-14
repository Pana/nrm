const fs = require('fs');
const ini = require('ini');
const chalk = require('chalk');

const { NRMRC, NPMRC, REGISTRIES } = require('./constants');

function readFile(file) {
  return fs.existsSync(file) ? ini.parse(fs.readFileSync(file, 'utf-8')) : {};
}

async function writeFile(path, content) {
  return new Promise((resolve, reject) => {
    try {
      fs.writeFileSync(path, ini.stringify(content));
      resolve();
    } catch (error) {
      reject(error);
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
  return new Promise((resolve, reject) => {
    let npmrc;
    try {
      npmrc = readFile(NPMRC);
    } catch (error) {
      reject(error);
      exit(error);
    }
    if (npmrc) {
      resolve(npmrc.registry);
    }
  });
}

async function getRegistries() {
  return new Promise((resolve, reject) => {
    let customRegistries;
    try {
      customRegistries = readFile(NRMRC);
    } catch (error) {
      reject(error);
      exit(error);
    }
    if (customRegistries) {
      resolve(Object.assign({}, REGISTRIES, customRegistries));
    }
  });
}

function exit(error) {
  printError(error);
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
};
