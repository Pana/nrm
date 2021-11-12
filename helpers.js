const chalk = require('chalk');

function padding(message = '', before = 1, after = 1) {
  return new Array(before).join(' ') + message + new Array(after).join(' ');
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

function exit(error) {
  printError(error);
  process.exit(1);
}

module.exports = {
  exit,
  geneDashLine,
  printError,
  printMessages,
};
