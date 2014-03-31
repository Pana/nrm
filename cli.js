#!/usr/bin/env node
var spawn       = require('child_process').spawn;
var registries  = require('./registries.json');
var version     = require('./package.json').version;
var fs          = require('fs');
var NPM         = process.platform === "win32" ? "npm.cmd" : "npm";

if (!module.parent) {
    var args    = process.argv.slice(2);
        cmd     = args[0];
        arg     = args[1];
        ar2     = args[2];
        ar3     = args[3];
    switch (cmd) {
        case 'ls':
        case 'list':
            printRegistries();
            break;
        case 'v':
        case 'version':
            printVersion();
            break;
        case 'use':
            useRegistry(arg);
            break;
        case 'home':
            openHome(arg);
            break;
        case 'add':
            addRegistry(arg, ar2, ar3);
            break;
        case 'del':
            delRegistry(arg);
            break;
        case 'h':
        case 'help':
        case undefined:
        default:
            help();
            break;
    }
}


/*
* run cmd
*/
function run (cmd, args, cbk) {
    var ls = spawn(cmd, args);
    var data = '', err = '';
    ls.stdout.on('data', function (tmp) {
        data += tmp;
    });
    ls.stderr.on('data', function (tmp) {
        err += tmp;
    });
    ls.on('close', function (code) {
        cbk && cbk(err, data);
    });
}

/*
* get current registry
*/
function getRegistry (cbk) {
    run(NPM, ['config', 'get', 'registry'], cbk);
}

/*
* set registry
*/
function setRegistry (registry, cbk) {
    run(NPM, ['config', 'set', 'registry', registry], cbk);
}

/*
* print registry info
*/
function printRegistries () {
    getRegistry(function (err, registry) {
        if(err) return printErr(err);
        // replace \n
        registry = registry.replace(/\n/g, '');

        var info = [];
        info.push('');
        registries.forEach(function (item) {
            var cur = item.registry ;
            var curP = cur === registry ? "* " : "  ";
            info.push(curP + item.name + line(item.name, 8) + item.registry);
        });
        info.push('');
        printMessage(info);
    });
}

/*
* 
*/
function line (str, len) {
    var line = new Array(len - str.length).join('-');
    return ' ' + line + ' ';
}

/*
*  print error
*/
function printErr (message) {
    mesage = message || '';
    console.log("Sorry some err happened " + message);
}

/*
*  find registry by name or url
*/
function _findRegistry (registry) {
    for (var i in registries) {
        var r = registries[i];
        if (r.name === registry || r.registry === registry)
            return r
    }
    // not find registry, print message and exit
    var message = [
        "",
        '   Not find registry: ' + registry,
        ""
    ];
    printMessage(message);
    process.exit();
}

function findRegistry (registry) {
    var r = _findRegistry(registry);
    return r.registry;
}

/*
* use registry
*/
function useRegistry (registry) {
    var r = findRegistry(registry);
    if(!r && /http/.test(registry))
        r = registry;

    setRegistry(r, function (err, result) {
        if(err)
            printErr(err);
        else{
            var message = [
                "",
                '    Registry has been set to: ' + r,
                ""
            ];
            printMessage(message);
        }
    });
}

/*
* goto registry home
*/
function openHome (registry) {
    var r = _findRegistry(registry);
    run('open', [r.home]);
}

/*
* Out put help message
*/
function help () {
    var message = [
        "",
        "Usage: nrm cmd [arg]",
        "",
        "Options:",
        "",
        "  ls, list          list all the registries, with * is using now",
        "  use registry      change registry to registry",
        "  home x registry   open registry home page with x (x is you brower or other)",
        "  v, version        output current version",
        "  h, help           output help message",
        "  del name          delete registry",
        "  add name registry (home)",
        "                    add registry (home is optional) ",
        ""
    ]
    printMessage(message);
}

/*
* output current version
*/
function printVersion () {
    var message = [
        "",
        '    Current version: ' + version,
        ""
    ];
    printMessage(message);
}

/*
* print message
*/
function printMessage (msg) {
    msg.forEach(function (i) {
        console.log(i);
    });
}

/*
* add registry
*/
function addRegistry(name, registry, home){
    registries.push({
        'name': name, 
        'registry': registry,
        'home': home
    });
    fs.writeFile('./registries.json', JSON.stringify(registries, null, '\t'), function(e){
        if (e) throw e;
        console.log("Successfully add ", arg, " ", ar2);
    });
}

/*
* del registry
*/
function delRegistry(arg){
    for (var i = 0; i < registries.length; i++) {
        item = registries[i];
        if (item.name == arg && i > 5){
            if (registries.splice(i, 1)) {
                console.log("Successfully delete " + item.name);
            }
        }
    };
    fs.writeFile('./registries.json', JSON.stringify(registries, null, '\t'), function(e){
        if (e) throw e;
    });
}
