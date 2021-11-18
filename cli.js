#!/usr/bin/env node

const actions = require('./actions');
const PKG = require('./package.json');
const { program } = require('commander');

program
  .version(PKG.version);

program
  .command('ls')
  .description('List all the registries')
  .action(actions.onList);

program
  .command('current')
  .option('-u, --show-url', 'Show the registry URL instead of the name')
  .description('Show current registry name or URL')
  .action(actions.onCurrent);

program
  .command('use <name>')
  .description('Change current registry')
  .action(actions.onUse);

program
  .command('add <name> <url> [home]')
  .description('Add custom registry')
  .action(actions.onAdd);

program
  .command('login <name> [base64]')
  .option('-a, --always-auth', 'Set is always auth')
  .option('-u, --username <username>', 'Your user name for this registry')
  .option('-p, --password <password>', 'Your password for this registry')
  .option('-e, --email <email>', 'Your email for this registry')
  .description('Set authorize information for a custom registry with a base64 encoded string or username and password')
  .action(actions.onLogin);

program
  .command('set-hosted-repo <name> <repo>')
  .description('Set hosted npm repository for a custom registry to publish package')
  .action(actions.onSetRepository);

program
  .command('set-scope <scopeName> <url>')
  .description('Associating a scope with a registry')
  .action(actions.onSetScope);

program
  .command('del-scope <scopeName>')
  .description('Remove a scope')
  .action(actions.onDeleteScope);

program
  .command('set <name>')
  .requiredOption('-a,--attr <attr>', 'Set a custom registry attribute')
  .requiredOption('-v,--value <value>', 'Set a custom registry value')
  .description('Set a custom registry attribute')
  .action(actions.onSetAttribute);

program
  .command('rename <name> <newName>')
  .description('Change custom registry name')
  .action(actions.onRename);

program
  .command('del <name>')
  .description('Delete custom registry')
  .action(actions.onDelete);

program
  .command('home <name> [browser]')
  .description('Open the homepage of registry with optional browser')
  .action(actions.onHome);

program
  .command('test [registry]')
  .description('Show response time for specific or all registries')
  .action(actions.onTest);

program
  .parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}
