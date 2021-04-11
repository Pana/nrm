#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const program = require('commander');
const npm = require('npm');
const ini = require('ini');
const extend = require('extend');
const open = require('open');
const async = require('async');
const request = require('request');
const only = require('only');
const humps = require('humps');

const registries = require('./registries.json');
const PKG = require('./package.json');
const NRMRC = path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.nrmrc');
const NPMRC = path.join(process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'], '.npmrc');

const FIELD_AUTH = '_auth';
const FIELD_ALWAYS_AUTH = 'always-auth';
const FIELD_IS_CURRENT = 'is-current';
const FIELD_REPOSITORY = 'repository';
const FIELD_REGISTRY = 'registry';
const FIELD_HOME = 'home';
const FIELD_EMAIL = 'email';
const FIELD_SHOW_URL = "show-url"
const REGISTRY_ATTRS = [FIELD_REGISTRY, FIELD_HOME, FIELD_AUTH, FIELD_ALWAYS_AUTH];
const IGNORED_ATTRS = [FIELD_IS_CURRENT, FIELD_REPOSITORY];


program
    .version(PKG.version);

program
    .command('ls')
    .description('List all the registries')
    .action(onList);

program
    .command('current')
    .option('-u, --show-url', 'Show the registry URL instead of the name')
    .description('Show current registry name or URL')
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
    .command('login <registryName> [value]')
    .option('-a, --always-auth', 'Set is always auth')
    .option('-u, --username <username>', 'Your user name for this registry')
    .option('-p, --password <password>', 'Your password for this registry')
    .option('-e, --email <email>', 'Your email for this registry')
    .description('Set authorize information for a custom registry with a base64 encoded string or username and pasword')
    .action(onLogin);

program
    .command('set-hosted-repo <registry> <value>')
    .description('Set hosted npm repository for a custom registry to publish packages')
    .action(onSetRepository);

program
    .command('set-scope <scopeName> <value>')
    .description('Associating a scope with a registry')
    .action(onSetScope);

program
    .command('del-scope <scopeName>')
    .description('Remove a scope')
    .action(onDelScope);

program
    .command('set <registryName>')
    .option('-a,--attr <attr>', 'Set custorm registry attribute')
    .option('-v,--value <value>', 'Set custorm registry value')
    .description('Set custom registry attribute')
    .action(onSet);
program
    .command('rename <registryName> <newName>')
    .description('Set custom registry name')
    .action(onRename);

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
    .description('Print this help \n if you want to clear the NRM configuration when uninstall you can execute "npm uninstall nrm -g -C or npm uninstall nrm -g --clean"')
    .action(function () {
        program.outputHelp();
    });

program
    .parse(process.argv);


if (process.argv.length === 2) {
    program.outputHelp();
}

/*//////////////// cmd methods /////////////////*/

function onList () {
    getCurrentRegistry(function (cur) {
        var info = [''];
        var allRegistries = getAllRegistry();
        const keys = Object.keys(allRegistries);
        const len = Math.max(...keys.map(key => key.length)) + 3;

        Object.keys(allRegistries).forEach(function (key) {
            var item = allRegistries[key];
            var prefix = item[FIELD_IS_CURRENT] && equalsIgnoreCase(item.registry, cur) ? '* ' : '  ';
            info.push(prefix + key + line(key, len) + item.registry);
        });

        info.push('');
        printMsg(info);
    });
}

function showCurrent (cmd) {
    getCurrentRegistry(function (cur) {
        var allRegistries = getAllRegistry();
        var customRegistries = getCustomRegistry();
        Object.keys(allRegistries).forEach(function (key) {
            var item = allRegistries[key];
            if (equalsIgnoreCase(item.registry, cur) && (customRegistries[key] || item[FIELD_IS_CURRENT])) {
                const showUrl = cmd[humps.camelize(FIELD_SHOW_URL)];
                printMsg([showUrl ? item.registry : key]);
                return;
            }
        });
    });
}

function config (attrArray, registry, index = 0) {
    return new Promise((resolve, reject) => {
        const attr = attrArray[index];
        const command = hasOwnProperty(registry, attr) ? ['set', attr, String(registry[attr])] : ['delete', attr];
        npm.load(function (err) {
            if (err) return reject(err);
            npm.commands.config(command, function (err, data) {
                return err ? reject(err) : resolve(index + 1);
            });
        });
    }).then(next => {
        if (next < attrArray.length) {
            return config(attrArray, registry, next);
        } else {
            return Promise.resolve();
        }
    });
}

function onUse (name) {
    var allRegistries = getAllRegistry();
    if (hasOwnProperty(allRegistries, name)) {
        getCurrentRegistry(function (cur) {
            let currentRegistry, item;
            for (let key of Object.keys(allRegistries)) {
                item = allRegistries[key];
                if (item[FIELD_IS_CURRENT] && equalsIgnoreCase(item.registry, cur)) {
                    currentRegistry = item;
                    break;
                }
            }
            var registry = allRegistries[name];
            let attrs = [].concat(REGISTRY_ATTRS).concat();
            for (let attr in Object.assign({}, currentRegistry, registry)) {
                if (!REGISTRY_ATTRS.includes(attr) && !IGNORED_ATTRS.includes(attr)) {
                    attrs.push(attr);
                }
            }

            config(attrs, registry).then(() => {
                console.log('                        ');
                const newR = npm.config.get(FIELD_REGISTRY);
                var customRegistries = getCustomRegistry();
                Object.keys(customRegistries).forEach(key => {
                    delete customRegistries[key][FIELD_IS_CURRENT];
                });
                if (hasOwnProperty(customRegistries, name) && (name in registries || customRegistries[name].registry === registry.registry)) {
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

function onDel (name) {
    var customRegistries = getCustomRegistry();
    if (!hasOwnProperty(customRegistries, name)) return;
    getCurrentRegistry(function (cur) {
        if (customRegistries[FIELD_IS_CURRENT] && equalsIgnoreCase(customRegistries[name].registry, cur)) {
            onUse('npm');
        }
        delete customRegistries[name];
        setCustomRegistry(customRegistries, function (err) {
            if (err) return exit(err);
            printMsg(['', '    delete registry ' + name + ' success', '']);
        });
    });
}

function onAdd (name, url, home) {
    var customRegistries = getCustomRegistry();
    // custom should not be in the non-custom registryList
    if (hasOwnProperty(registries, name)) {
        console.log(`${name} has been in the registry!`);
        return;
    }
    if (hasOwnProperty(customRegistries, name)) return;
    var config = customRegistries[name] = {};
    if (url[url.length - 1] !== '/') url += '/'; // ensure url end with /
    config.registry = url;
    if (home) {
        config.home = home;
    }
    setCustomRegistry(customRegistries, function (err) {
        if (err) return exit(err);
        printMsg(['', '    add registry ' + name + ' success', '']);
    });
}

function onLogin (registryName, value, cmd) {
    const customRegistries = getCustomRegistry();
    if (!hasOwnProperty(customRegistries, registryName)) return;
    const registry = customRegistries[registryName];
    let attrs = [FIELD_AUTH];
    if (value) {
        registry[FIELD_AUTH] = value;
    } else if (cmd.username && cmd.password) {
        registry[FIELD_AUTH] = Buffer.from(`${cmd.username}:${cmd.password}`).toString('base64');
    } else {
        return exit(new Error('your username & password or auth value is required'));
    }
    if (cmd[humps.camelize(FIELD_ALWAYS_AUTH)]) {
        registry[FIELD_ALWAYS_AUTH] = true;
        attrs.push(FIELD_ALWAYS_AUTH);
    }
    if (cmd.email) {
        registry.email = cmd.email;
        attrs.push(FIELD_EMAIL);
    }
    new Promise(resolve => {
        registry[FIELD_IS_CURRENT] ? resolve(config(attrs, registry)) : resolve();
    }).then(() => {
        customRegistries[registryName] = registry;
        setCustomRegistry(customRegistries, function (err) {
            if (err) return exit(err);
            printMsg(['', '    set authorize info to registry ' + registryName + ' success', '']);
        });
    }).catch(exit);
}

function onSetRepository (registry, value) {
    var customRegistries = getCustomRegistry();
    if (!hasOwnProperty(customRegistries, registry)) return;
    var config = customRegistries[registry];
    config[FIELD_REPOSITORY] = value;
    new Promise(resolve => {
        config[FIELD_IS_CURRENT] ? resolve(config([FIELD_REPOSITORY], config)) : resolve();
    }).then(() => {
        setCustomRegistry(customRegistries, function (err) {
            if (err) return exit(err);
            printMsg(['', `    set ${FIELD_REPOSITORY} to registry [${registry}] success`, '']);
        });
    }).catch(exit);
}

function onSetScope (scopeName, value) {
    const npmrc = getNPMInfo();
    const scopeRegistryKey = `${scopeName}:registry`;
    config([scopeRegistryKey], { [scopeRegistryKey]: value }).then(function () {
        printMsg(['', `    set [ ${scopeRegistryKey}=${value} ] success`, '']);
    }).catch(exit)
}

function onDelScope (scopeName) {
    const npmrc = getNPMInfo();
    const scopeRegistryKey = `${scopeName}:registry`
    npmrc[scopeRegistryKey] && config([scopeRegistryKey], {}).then(function () {
        printMsg(['', `    delete [ ${scopeRegistryKey} ] success`, '']);
    }).catch(exit)
}

function onSet (registryName, cmd) {
    if (!registryName || !cmd.attr || cmd.value === undefined) return;
    if (IGNORED_ATTRS.includes(cmd.attr)) return;
    var customRegistries = getCustomRegistry();
    if (!hasOwnProperty(customRegistries, registryName)) return;
    const registry = customRegistries[registryName];
    registry[cmd.attr] = cmd.value;
    new Promise(resolve => {
        registry[FIELD_IS_CURRENT] ? resolve(config([cmd.attr], registry)) : resolve();
    }).then(() => {
        customRegistries[registryName] = registry;
        setCustomRegistry(customRegistries, function (err) {
            if (err) return exit(err);
            printMsg(['', `    set registry ${registryName} [${cmd.attr}=${cmd.value}] success`, '']);
        });
    }).catch(exit);
}

function onRename (registryName, newName) {
    if (!newName || registryName === newName) return;
    let customRegistries = getCustomRegistry();
    if (!hasOwnProperty(customRegistries, registryName)) {
        console.log('Only custom registries can be modified');
        return;
    }
    if (registries[newName] || customRegistries[newName]) {
        console.log('The registry contains this new name');
        return;
    }
    customRegistries[newName] = JSON.parse(JSON.stringify(customRegistries[registryName]));
    delete customRegistries[registryName];
    setCustomRegistry(customRegistries, function (err) {
        if (err) return exit(err);
        printMsg(['', `    rename ${registryName} to ${newName} success`, '']);
    });
}

function onHome (name, browser) {
    var allRegistries = getAllRegistry();
    var home = allRegistries[name] && allRegistries[name].home;
    if (home) {
        var args = [home];
        if (browser) args.push(browser);
        open.apply(null, args);
    }
}

function onPublish (tarballOrFolder, cmd) {
    getCurrentRegistry(registry => {
        const customRegistries = getCustomRegistry();
        let currentRegistry;
        // find current using custom registry
        Object.keys(customRegistries).forEach(function (key) {
            const item = customRegistries[key];
            if (item[FIELD_IS_CURRENT] && equalsIgnoreCase(item.registry, registry)) {
                currentRegistry = item;
                currentRegistry.name = key;
            }
        });
        const attrs = [FIELD_REGISTRY];
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
                Object.keys(registries).forEach(function (key) {
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

function onTest (registry) {
    var allRegistries = getAllRegistry();

    var toTest;

    if (registry) {
        if (!hasOwnProperty(allRegistries, registry)) {
            return;
        }
        toTest = only(allRegistries, registry);
    } else {
        toTest = allRegistries;
    }

    async.map(Object.keys(toTest), function (name, cbk) {
        var registry = toTest[name];
        var start = +new Date();
        request(registry.registry + 'pedding', function (error) {
            cbk(null, {
                name: name,
                registry: registry.registry,
                time: (+new Date() - start),
                error: error ? true : false
            });
        });
    }, function (err, results) {
        getCurrentRegistry(function (cur) {
            var msg = [''];
            results.forEach(function (result) {
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
function getCurrentRegistry (cbk) {
    npm.load(function (err, conf) {
        if (err) return exit(err);
        cbk(npm.config.get(FIELD_REGISTRY));
    });
}

function getCustomRegistry () {
    return getINIInfo(NRMRC)
}

function setCustomRegistry (config, cbk) {
    for (let name in config) {
        if (name in registries) {
            delete config[name].registry;
            delete config[name].home;
        }
    }
    fs.writeFile(NRMRC, ini.stringify(config), cbk)
}

function getAllRegistry () {
    const custom = getCustomRegistry();
    const all = extend({}, registries, custom);
    for (let name in registries) {
        if (name in custom) {
            all[name] = extend({}, custom[name], registries[name]);
        }
    }
    return all;
}

function printErr (err) {
    console.error('an error occured: ' + err);
}

function printMsg (infos) {
    infos.forEach(function (info) {
        console.log(info);
    });
}

function getNPMInfo () {
    return getINIInfo(NPMRC)
}


function getINIInfo (path) {
    return fs.existsSync(path) ? ini.parse(fs.readFileSync(path, 'utf-8')) : {};
}

/*
 * print message & exit
 */
function exit (err) {
    printErr(err);
    process.exit(1);
}

function line (str, len) {
    var line = new Array(Math.max(2, len - str.length + 2)).join('-');
    return ' ' + line + ' ';
}

/**
 * compare ignore case
 *
 * @param {string} str1
 * @param {string} str2
 */
function equalsIgnoreCase (str1, str2) {
    if (str1 && str2) {
        return str1.toLowerCase() === str2.toLowerCase();
    } else {
        return !str1 && !str2;
    }
}

function cleanRegistry () {
    setCustomRegistry('', function (err) {
        if (err) exit(err);
        onUse('npm')
    })
}

function hasOwnProperty (object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
}

module.exports = {
    cleanRegistry,
    errExit: exit
}
