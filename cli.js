#!/usr/bin/env node
var path = require('path');
var fs = require('fs');
var program = require('commander');
var npm = require('npm');
var ini = require('ini');
var echo = require('node-echo');
var extend = require('extend');
var open = require('open');
var async = require('async');
var request = require('request');
var only = require('only');

var registries = require('./registries.json');
var PKG = require('./package.json');
var NRMRC = path.join(process.env.HOME, '.nrmrc');

var REGISTRY_ATTRS = [];
var FIELD_IS_CURRENT = 'is-current';
var FIELD_REPOSITORY = 'repository';
var IGNORED_ATTRS = [FIELD_IS_CURRENT, FIELD_REPOSITORY];


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
    .command('set-auth <registry> <value> [always]')
    .description('Set authorize information for a custom registry')
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
    .action(function () {
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
            info.push(prefix + key + line(key, 8) + item.registry);
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
        const attr =  attrArray[index];
        const command = registry.hasOwnProperty(attr) ? ['set', attr, String(registry[attr])] : ['delete', attr];
        npm.commands.config(command, function (err, data) {
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
        npm.load(function (err) {
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
                printMsg([
                    '', '   Registry has been set to: ' + newR, ''
                ]);
            }).catch(err => {
                exit(err);
            });
        });
    } else {
        printMsg([
            '', '   Not find registry: ' + name, ''
        ]);
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
            printMsg([
                '', '    delete registry ' + name + ' success', ''
            ]);
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
        printMsg([
            '', '    add registry ' + name + ' success', ''
        ]);
    });
}

function onSetAuth(registry, value, always) {
    var customRegistries = getCustomRegistry();
    if (!customRegistries.hasOwnProperty(registry)) return;
    var config = customRegistries[registry];
    config._auth = value;
    if (always) {
        config['always-auth'] = always;
    }
    setCustomRegistry(customRegistries, function(err) {
        if (err) return exit(err);
        printMsg(['', '    set authorize info to registry ' + registry + ' success', '']);
    });
}

function onSetEmail(registry, value) {
    var customRegistries = getCustomRegistry();
    if (!customRegistries.hasOwnProperty(registry)) return;
    var config = customRegistries[registry];
    config.email = value;
    setCustomRegistry(customRegistries, function(err) {
        if (err) return exit(err);
        printMsg(['', '    set email to registry ' + registry + ' success', '']);
    });
}

function onSetRepository(registry, value) {
    var customRegistries = getCustomRegistry();
    if (!customRegistries.hasOwnProperty(registry)) return;
    var config = customRegistries[registry];
    config[FIELD_REPOSITORY] = value;
    setCustomRegistry(customRegistries, function(err) {
        if (err) return exit(err);
        printMsg(['', `    set ${FIELD_REPOSITORY} to registry [${registry}] success`, '']);
    });
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
        var customRegistries = getCustomRegistry();
        var currentRegistry;
        Object.keys(customRegistries).forEach(function(key) {
            var item = customRegistries[key];
            if (item.registry === registry && item['is-current']) {
                currentRegistry = item;
                currentRegistry.name = key;
                return;
            }
        });
        if (currentRegistry) {
            if (currentRegistry[FIELD_REPOSITORY]) {
                const optionData = {
                    registry: currentRegistry[FIELD_REPOSITORY]
                };
                const attrs = ['registry'];
                let command = `npm publish --registry ${currentRegistry[FIELD_REPOSITORY]}`;
                cmd.options.forEach(option => {
                    const opt = option.long.substring(2);
                    const optionValue = cmd[opt];
                    if (optionValue) {
                        command += ` ${option.long} ${optionValue}`;
                        optionData[opt] = cmd[opt];
                        attrs.push(opt);
                    }
                });
                console.info(command);
                new Promise((resolve, reject) => {
                    attrs.length ? resolve(config(attrs, optionData)) : resolve();
                }).then(() => {
                    const callback = (err) => {
                        new Promise(resolve => {
                            attrs.length ? resolve(config(attrs, currentRegistry)) : resolve();
                        }).then(() => {
                            if (err) {
                                exit(err);
                            }
                            printMsg([ '',
                            `   published to registry ${currentRegistry[FIELD_REPOSITORY]} successfully.`,
                            '']);
                        }).catch(err => {
                            exit(err);
                        });
                    };
                    try {
                        tarballOrFolder ? npm.publish(tarballOrFolder, callback) : npm.publish(callback);
                    } catch (e) {
                        callback(err);
                    }
                });
            } else {
                printMsg([ '',
                `   current using registry [${currentRegistry.name}] has no ${FIELD_REPOSITORY} field, can't execute publish.`,
                '']);
            }
        } else {
            printMsg([ '',
            `   current using registry is not a custom registry, will run npm publish directly.`,
            '']);
            tarballOrFolder ? npm.publish(tarballOrFolder) : npm.publish();
        }
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
