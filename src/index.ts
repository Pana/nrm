#!/usr/bin/env node

import { Command } from 'commander';
import packageJson from '../package.json';
import {
  onAdd,
  onCurrent,
  onDelete,
  onDeleteScope,
  onHome,
  onList,
  onLogin,
  onRename,
  onSetAttribute,
  onSetRepository,
  onSetScope,
  onTest,
  onUse,
} from './actions.js';

const program = new Command();

const { name, version, description } = packageJson;
program.name(name).description(description).version(version);

program.command('ls').description('List all the registries').action(onList);

program
  .command('current')
  .option('-u, --show-url', 'Show the registry URL instead of the name')
  .description('Show current registry name or URL')
  .action(onCurrent);

program
  .command('use [name]')
  .description('Change current registry')
  .action(onUse);

program
  .command('add <name> <url> [home]')
  .description('Add custom registry')
  .action(onAdd);

program
  .command('login <name> [base64]')
  .option('-a, --always-auth', 'Set is always auth')
  .option('-u, --username <username>', 'Your user name for this registry')
  .option('-p, --password <password>', 'Your password for this registry')
  .option('-e, --email <email>', 'Your email for this registry')
  .description(
    'Set authorize information for a custom registry with a base64 encoded string or username and password',
  )
  .action(onLogin);

program
  .command('set-hosted-repo <name> <repo>')
  .description(
    'Set hosted npm repository for a custom registry to publish package',
  )
  .action(onSetRepository);

program
  .command('set-scope <scopeName> <url>')
  .description('Associating a scope with a registry')
  .action(onSetScope);

program
  .command('del-scope <scopeName>')
  .description('Remove a scope')
  .action(onDeleteScope);

program
  .command('set <name>')
  .requiredOption('-a,--attr <attr>', 'Set a custom registry attribute')
  .requiredOption('-v,--value <value>', 'Set a custom registry value')
  .description('Set a custom registry attribute')
  .action(onSetAttribute);

program
  .command('rename <name> <newName>')
  .description('Change custom registry name')
  .action(onRename);

program
  .command('del <name>')
  .description('Delete custom registry')
  .action(onDelete);

program
  .command('home <name> [browser]')
  .description('Open the homepage of registry with optional browser')
  .action(onHome);

program
  .command('test [registry]')
  .description('Show response time for specific or all registries')
  .action(() => {
    onTest();
  }); // ignore return value to pass typescript check

program.parse(process.argv);

if (process.argv.length === 2) {
  program.outputHelp();
}
