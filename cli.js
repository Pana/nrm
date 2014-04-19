#!/usr/bin/env node
var path = require('path');
var fs = require('fs');

var program = require('commander');
var npmconf = require('npmconf');
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
    .description('list all the registries')
    .action(onList);

program
    .command('use <registry>')
    .description('change registry to registry')
    .action(onUse);

program
    .command('add <registry> <url> [home]')
    .description('add one custom registry')
    .action(onAdd);

program
    .command('del <registry>')
    .description('delete one custom registry')
    .action(onDel);

program
    .command('rm <registry>')
    .description('delete one custom registry')
    .action(onDel);

program
    .command('home <registry> [browser]')
    .description('open the homepage of registry with optional browser')
    .action(onHome);

program
    .command('test [registry]')
    .description('show response time for specific or all registries')
    .action(onTest);    

program
    .command('help')
    .description('print this help')
    .action(program.help);

program
    .parse(process.argv);




/*//////////////// cmd methods /////////////////*/

function onList() {
    getCurrentRegistry(function (cur) {
        var info = [''];
        var allRegistries = getAllRegistry();

        Object.keys(allRegistries).forEach(function(key){
            var item = allRegistries[key];
            var prefix = item.registry === cur ? '* ' : '  ';
            info.push(prefix + key + line(key, 8) + item.registry);
        });

        info.push('');
        printMsg(info);
    });
}

function onUse(name){
    var allRegistries = getAllRegistry();

    if(allRegistries.hasOwnProperty(name)){
        var registry = allRegistries[name];
        npmconf.load(function(err, conf){
            if(err){
                exit(err);
            }

            conf.set('registry', registry.registry, 'user');
            conf.save('user', function(err){
                if(err){
                    exit(err);
                }
                printMsg([
                    ''
                    , '   Registry has been set to: ' + registry.registry
                    , ''
                ]);
            });
        });
    }else{
        printMsg([
            ''
            , '   Not find registry: ' + name
            , ''
        ]);
    }
}

function onDel(name){
    var customRegistries = getCustomRegistry();
    if(!customRegistries.hasOwnProperty(name)){
        return;
    }

    getCurrentRegistry(function (cur) {
        if (cur === customRegistries[name].registry) {
            onUse('npm');
        }

        delete customRegistries[name];
        setCustomRegistry(customRegistries, function(err){
            if(err){
                exit(err);
            }
            printMsg([
                ''
                , '    delete registry ' + name + ' success'
                , ''
            ]);
        });
    });
}

function onAdd(name, url, home){
    var customRegistries = getCustomRegistry();
    if(customRegistries.hasOwnProperty(name)){
        return;
    }

    var config = customRegistries[name] = {};
    if (url[url.length-1] !== '/') url += '/';  // ensure url end with /
    config.registry = url;
    if(home){
        config.home = home;
    }

    setCustomRegistry(customRegistries, function(err){
        if(err){
            exit(err);
        }
        printMsg([
            ''
            , '    add registry ' + name + ' success'
            , ''
        ]);
    });
}

function onHome(name, browser){
    var allRegistries = getAllRegistry();
    var home = allRegistries[name] && allRegistries[name].home;
    if (home) {
        var args = [home];
        if (browser) args.push(browser);
        open.apply(null, args);
    }
}

function onTest(registry){
    var allRegistries = getAllRegistry();

    var toTest;

    if(registry){
        if(!allRegistries.hasOwnProperty(registry)){
            return;
        }
        toTest = only(allRegistries, registry);
    }else{
        toTest = allRegistries;
    }

    async.map(Object.keys(toTest), function(name, cbk){
        var registry = toTest[name];
        var start = +new Date();
        request(registry.registry, function(error){
            cbk(null, {
                name: name
                , registry: registry.registry
                , time: (+new Date() - start)
                , error: error ? true : false
            });
        });
    }, function(err, results){
        getCurrentRegistry(function(cur){
            var msg = [''];
            results.forEach(function(result){
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
    npmconf.load(function(err, conf){
        if(err){
            exit(err);
        }

        cbk(conf.get('registry'));
    });
}

function getCustomRegistry(){
    return fs.existsSync(NRMRC) ? ini.parse(fs.readFileSync(NRMRC, 'utf-8')) : {};
}

function setCustomRegistry(config, cbk){
    echo(ini.stringify(config), '>', NRMRC, cbk);
}

function getAllRegistry(){
    return extend({}, registries, getCustomRegistry());
}

function printErr(err){
    console.error('an error occured: ' + err);
}

function printMsg(infos){
    infos.forEach(function(info){
        console.log(info);
    });
}

/*
* print message & exit
*/
function exit (err) {
    printErr(err);
    process.exit(1);
}

function line (str, len) {
    var line = new Array(len - str.length).join('-');
    return ' ' + line + ' ';
}

/*
* The function of http get
*/
function httpGetFunc(name, options, timeout, cbk) {
    var req_time    = null, req = null;
    req_time        = setTimeout(function() {
        req.destroy();
    }, timeout);

    req = http.get(options, function() {
        clearTimeout(req_time);
    });
    req.on('response', function() {
        req.destroy();
        cbk();
    });
    req.on('error', function(e) {
        if(req_time) {
            clearTimeout(req_time);
            console.log(name, '\t:', options['host']);
            console.log('Timeout, error : ', e);
        }
    });
}

/*
* get the test time
*/
function getTimes(httpGetFunc, basetime, registry) {
    options = {
        host : '',
        port : '80',
        path : '/'
    }
    if (registry != null) {
        var regis   = findRegistry(registry);
        var start   = new Date().getTime();
        var pagenum = regis.match(/\:\/\/(.*)[\:]{0,1}([0-9]*)\//)[1];
        cutUrl = pagenum.split(":");
        if (cutUrl.length === 1) {
            options['host'] = cutUrl[0];
        }
        else {
            options['host'] = cutUrl[0];
            options['port'] = cutUrl[1];
        }
        httpGetFunc(registry, options, Number(basetime), function() {
            console.log('\t', registry, ' : ', new Date().getTime() - start, 'ms');
        });
    }
    else {
        registries.forEach(function(item) {
            options = {
                host : '',
                port : '80',
                path : '/'
            }
            var registry    = item.registry;
            var start       = new Date().getTime();
            var pagenum     = registry.match(/\:\/\/(.*)\//)[1];
            cutUrl = pagenum.split(":");
            if (cutUrl.length === 1) {
                options['host'] = cutUrl[0];
                options['port'] = 80;
            }
            else {
                options['host'] = cutUrl[0];
                options['port'] = cutUrl[1];
            }
            httpGetFunc(item.name, options, Number(basetime), function() {
                console.log('\t', item.name, '\t: ', new Date().getTime() - start, 'ms');
            });
        });
    }
}
