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
    .command('del <registry>')
    .description('Delete one custom registry')
    .action(onDel);

program
    .command('home <registry> [browser]')
    .description('Open the homepage of registry with optional browser')
    .action(onHome);

program
    .command('test [registry]')
    .description('Show response time for specific or all registries')
    .action(onTest);

program
    .command('help')
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

function onUse(name) {
    var allRegistries = getAllRegistry();
    if (allRegistries.hasOwnProperty(name)) {
        var registry = allRegistries[name];
        npm.load(function (err) {
            if (err) return exit(err);
            npm.commands.config(['set', 'registry', registry.registry], function (err, data) {
                if (err) return exit(err);
                console.log('                        ');
                var newR = npm.config.get('registry');
                printMsg([
                    '', '   Registry has been set to: ' + newR, ''
                ]);
            })
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

function onHome(name, browser) {
    var allRegistries = getAllRegistry();
    var home = allRegistries[name] && allRegistries[name].home;
    if (home) {
        var args = [home];
        if (browser) args.push(browser);
        open.apply(null, args);
    }
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
