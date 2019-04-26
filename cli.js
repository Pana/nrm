#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const program = require('commander');
const npm = require('npm');
const ini = require('ini');
const echo = require('node-echo');
const extend = require('extend');
const open = require('open');
const async = require('async');
const request = require('request');
const only = require('only');

const registries = require('./registries.json');
const PKG = require('./package.json');
const NRMRC = path.join(process.env.HOME, '.nrmrc');

const REGISTRY_ATTRS = [];
const FIELD_AUTH = '_auth';
const FIELD_ALWAYS_AUTH = 'always-auth';
const FIELD_IS_CURRENT = 'is-current';
const FIELD_REPOSITORY = 'repository';
const IGNORED_ATTRS = [FIELD_IS_CURRENT, FIELD_REPOSITORY];


program
    .version(PKG.version);

program
    .command('ls')
    .description('List all the registries')
    .action(onList);

program
    .command('current')
    .description('Show current registry name')
    .action(showCurrent);

program
    .command('use <registry>')
    .description('Change registry to registry')
    .action(onUse);

program
    .command('add <registry> <url> [home]')
    .description('Add one custom registry')
    .action(onAdd);

program
    .command('set-auth <registry> [value]')
    .option('-a, --always-auth', 'Set is always auth')
    .option('-u, --username <username>', 'Your user name for this registry')
    .option('-p, --password <password>', 'Your password for this registry')
    .description('Set authorize information for a custom registry with a base64 encoded string or username and pasword')
    .action(onSetAuth);

program
    .command('set-email <registry> <value>')
    .description('Set email for a custom registry')
    .action(onSetEmail);

program
    .command('set-hosted-repo <registry> <value>')
    .description('Set hosted npm repository for a custom registry to publish packages')
    .action(onSetRepository);

program
    .command('del <registry>')
    .description('Delete one custom registry')
    .action(onDel);

program
    .command('home <registry> [browser]')
    .description('Open the homepage of registry with optional browser')
    .action(onHome);

program
    .command('publish [<tarball>|<folder>]')
    .option('-t, --tag [tag]', 'Add tag')
    .option('-a, --access <public|restricted>', 'Set access')
    .option('-o, --otp [otpcode]', 'Set otpcode')
    .option('-dr, --dry-run', 'Set is dry run')
    .description('Publish package to current registry if current registry is a custom registry.\n if you\'re not using custom registry, this command will run npm publish directly')
    .action(onPublish);

program
    .command('test [registry]')
    .description('Show response time for specific or all registries')
    .action(onTest);

program
    .command('help', { isDefault: true })
    .description('Print this help')
    .action(function() {
        program.outputHelp();
    });

program
    .parse(process.argv);


if (process.argv.length === 2) {
    program.outputHelp();
}

/*//////////////// cmd methods /////////////////*/

function onList() {
    getCurrentRegistry(function(cur) {
        var info = [''];
        var allRegistries = getAllRegistry();

        Object.keys(allRegistries).forEach(function(key) {
            var item = allRegistries[key];
            var prefix = item.registry === cur ? '* ' : '  ';
            info.push(prefix + key + line(key, 12) + item.registry);
        });

        info.push('');
        printMsg(info);
    });
}

function showCurrent() {
    getCurrentRegistry(function(cur) {
        var allRegistries = getAllRegistry();
        Object.keys(allRegistries).forEach(function(key) {
            var item = allRegistries[key];
            if (item.registry === cur) {
                printMsg([key]);
                return;
            }
        });
    });
}

function config(attrArray, registry, index = 0) {
    return new Promise((resolve, reject) => {
        const attr = attrArray[index];
        const command = registry.hasOwnProperty(attr) ? ['set', attr, String(registry[attr])] : ['delete', attr];
        npm.commands.config(command, function(err, data) {
            return err ? reject(err) : resolve(index + 1);
        });
    }).then(next => {
        if (next < attrArray.length) {
            return config(attrArray, registry, next);
        } else {
            return Promise.resolve();
        }
    });
}

function onUse(name) {
    var allRegistries = getAllRegistry();
    if (allRegistries.hasOwnProperty(name)) {
        var registry = allRegistries[name];
        npm.load(function(err) {
            if (err) return exit(err);
            const attrs = [].concat(REGISTRY_ATTRS);
            for (let attr in registry) {
                if (!REGISTRY_ATTRS.includes(attr) && !IGNORED_ATTRS.includes(attr)) {
                    attrs.push(attr);
                }
            }
            config(attrs, registry).then(() => {
                console.log('                        ');
                var newR = npm.config.get('registry');
                var customRegistries = getCustomRegistry();
                Object.keys(customRegistries).forEach(key => {
                    delete customRegistries[key][FIELD_IS_CURRENT];
                });
                if (customRegistries.hasOwnProperty(name) && customRegistries[name].registry === registry.registry) {
                    registry[FIELD_IS_CURRENT] = true;
                    customRegistries[name] = registry;
                }
                setCustomRegistry(customRegistries);
                printMsg(['', '   Registry has been set to: ' + newR, '']);
            }).catch(err => {
                exit(err);
            });
        });
    } else {
        printMsg(['', '   Not find registry: ' + name, '']);
    }
}

function onDel(name) {
    var customRegistries = getCustomRegistry();
    if (!customRegistries.hasOwnProperty(name)) return;
    getCurrentRegistry(function(cur) {
        if (cur === customRegistries[name].registry) {
            onUse('npm');
        }
        delete customRegistries[name];
        setCustomRegistry(customRegistries, function(err) {
            if (err) return exit(err);
            printMsg(['', '    delete registry ' + name + ' success', '']);
        });
    });
}

function onAdd(name, url, home) {
    var customRegistries = getCustomRegistry();
    if (customRegistries.hasOwnProperty(name)) return;
    var config = customRegistries[name] = {};
    if (url[url.length - 1] !== '/') url += '/'; // ensure url end with /
    config.registry = url;
    if (home) {
        config.home = home;
    }
    setCustomRegistry(customRegistries, function(err) {
        if (err) return exit(err);
        printMsg(['', '    add registry ' + name + ' success', '']);
    });
}

function onSetAuth(registry, value, cmd) {
    const customRegistries = getCustomRegistry();
    if (!customRegistries.hasOwnProperty(registry)) return;
    const config = customRegistries[registry];
    const attrs = [FIELD_AUTH];
    if (value) {
        config[FIELD_AUTH] = value;
    } else if (cmd.username && cmd.password) {
        config[FIELD_AUTH] = new Buffer(`${cmd.username}:${cmd.password}`).toString('base64');
    } else {
        return exit(new Error('your username & password or auth value is required'));
    }
    if (cmd[FIELD_ALWAYS_AUTH]) {
        config[FIELD_ALWAYS_AUTH] = true;
        attrs.push(FIELD_ALWAYS_AUTH);
    }
    new Promise(resolve => {
        config[FIELD_IS_CURRENT] ? resolve(config(attrs, config)) : resolve();
    }).then(() => {
        customRegistries[registry] = config;
        setCustomRegistry(customRegistries, function(err) {
            if (err) return exit(err);
            printMsg(['', '    set authorize info to registry ' + registry + ' success', '']);
        });
    }).catch(exit);
}

function onSetEmail(registry, value) {
    const customRegistries = getCustomRegistry();
    if (!customRegistries.hasOwnProperty(registry)) return;
    const config = customRegistries[registry];
    config.email = value;
    new Promise(resolve => {
        config[FIELD_IS_CURRENT] ? resolve(config(['email'], config)) : resolve();
    }).then(() => {
        customRegistries[registry] = config;
        setCustomRegistry(customRegistries, function(err) {
            if (err) return exit(err);
            printMsg(['', '    set email to registry ' + registry + ' success', '']);
        });
    }).catch(exit);
}

function onSetRepository(registry, value) {
    var customRegistries = getCustomRegistry();
    if (!customRegistries.hasOwnProperty(registry)) return;
    var config = customRegistries[registry];
    config[FIELD_REPOSITORY] = value;
    new Promise(resolve => {
        config[FIELD_IS_CURRENT] ? resolve(config([FIELD_REPOSITORY], config)) : resolve();
    }).then(() => {
        setCustomRegistry(customRegistries, function(err) {
            if (err) return exit(err);
            printMsg(['', `    set ${FIELD_REPOSITORY} to registry [${registry}] success`, '']);
        });
    }).catch(exit);
}

function onHome(name, browser) {
    var allRegistries = getAllRegistry();
    var home = allRegistries[name] && allRegistries[name].home;
    if (home) {
        var args = [home];
        if (browser) args.push(browser);
        open.apply(null, args);
    }
}

function onPublish(tarballOrFolder, cmd) {
    getCurrentRegistry(registry => {
        const customRegistries = getCustomRegistry();
        let currentRegistry;
        // find current using custom registry
        Object.keys(customRegistries).forEach(function(key) {
            const item = customRegistries[key];
            if (item.registry === registry && item['is-current']) {
                currentRegistry = item;
                currentRegistry.name = key;
            }
        });
        const attrs = ['registry'];
        let command = '> npm publish';
        const optionData = {};
        cmd.options.forEach(option => {
            const opt = option.long.substring(2);
            const optionValue = cmd[opt];
            if (optionValue) {
                optionData[opt] = cmd[opt];
                attrs.push(opt);
            }
        });
        new Promise((resolve, reject) => {
            if (currentRegistry) {
                if (currentRegistry[FIELD_REPOSITORY]) {
                    printMsg(['',
                        '   current registry is a custom registry, publish to custom repository.',
                        ''
                    ]);
                    optionData.registry = currentRegistry[FIELD_REPOSITORY];
                    command += ` --registry ${currentRegistry[FIELD_REPOSITORY]}`;
                    Object.keys(optionData).forEach((key) => {
                        command += ` --${key} ${optionData[key]}`;
                    });
                    printMsg([command]);
                    resolve(config(attrs, optionData));
                } else {
                    reject(new Error(`   current using registry [${currentRegistry.name}] has no ${FIELD_REPOSITORY} field, can't execute publish.`));
                }
            } else {
                printMsg(['',
                    '   current using registry is not a custom registry, will publish to npm official repository.',
                    ''
                ]);
                optionData.registry = registries.npm.registry;
                // find current using registry
                Object.keys(registries).forEach(function(key) {
                    const item = registries[key];
                    if (item.registry === registry) {
                        currentRegistry = item;
                        currentRegistry.name = key;
                    }
                });
                printMsg([command]);
                resolve(config(attrs, optionData));
            }
        }).then(() => {
            const callback = (err) => {
                config(attrs, currentRegistry).then(() => {
                    err && exit(err);
                    printMsg(['', `   published to registry ${currentRegistry[FIELD_REPOSITORY]} successfully.`, '']);
                }).catch(exit);
            };
            try {
                tarballOrFolder ? npm.publish(tarballOrFolder, callback) : npm.publish(callback);
            } catch (e) {
                callback(err);
            }
        }).catch(err => {
            printErr(err);
        });
    });
}

function onTest(registry) {
    var allRegistries = getAllRegistry();

    var toTest;

    if (registry) {
        if (!allRegistries.hasOwnProperty(registry)) {
            return;
        }
        toTest = only(allRegistries, registry);
    } else {
        toTest = allRegistries;
    }

    async.map(Object.keys(toTest), function(name, cbk) {
        var registry = toTest[name];
        var start = +new Date();
        request(registry.registry + 'pedding', function(error) {
            cbk(null, {
                name: name,
                registry: registry.registry,
                time: (+new Date() - start),
                error: error ? true : false
            });
        });
    }, function(err, results) {
        getCurrentRegistry(function(cur) {
            var msg = [''];
            results.forEach(function(result) {
                var prefix = result.registry === cur ? '* ' : '  ';
                var suffix = result.error ? 'Fetch Error' : result.time + 'ms';
                msg.push(prefix + result.name + line(result.name, 8) + suffix);
            });
            msg.push('');
            printMsg(msg);
        });
    });
}



/*//////////////// helper methods /////////////////*/

/*
 * get current registry
 */
function getCurrentRegistry(cbk) {
    npm.load(function(err, conf) {
        if (err) return exit(err);
        cbk(npm.config.get('registry'));
    });
}

function getCustomRegistry() {
    return fs.existsSync(NRMRC) ? ini.parse(fs.readFileSync(NRMRC, 'utf-8')) : {};
}

function setCustomRegistry(config, cbk) {
    echo(ini.stringify(config), '>', NRMRC, cbk);
}

function getAllRegistry() {
    return extend({}, registries, getCustomRegistry());
}

function printErr(err) {
    console.error('an error occured: ' + err);
}

function printMsg(infos) {
    infos.forEach(function(info) {
        console.log(info);
    });
}

/*
 * print message & exit
 */
function exit(err) {
    printErr(err);
    process.exit(1);
}

function line(str, len) {
    var line = new Array(Math.max(1, len - str.length)).join('-');
    return ' ' + line + ' ';
}
