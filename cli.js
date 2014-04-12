#!/usr/bin/env node
    
    // system node_modules
var path = require('path')
    , fs = require('fs')

    // npm node_modules
    , npmconf = require('npmconf')
    , program = require('commander')
    , ini = require('ini')
    , echo = require('node-echo')
    , extend = require('extend')
    , open = require('open')

    // locals
    , registries = require('./registries.json')
    , pkg = require('./package.json')
    ;

program
    .version(pkg.version);

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
    .command('home <registry> [brower]')
    .description('open the homepage of registry with optional brower')
    .action(onHome);

program
    .command('help')
    .description('print this help')
    .action(program.help);

program.parse(process.argv);


function onList(){
    npmconf.load(function(err, conf){
        if(err){
            printErr(err);
            process.exit(1);
        }
        var cur = conf.get('registry');
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
                printErr(err);
                process.exit(1);
            }

            conf.set('registry', registry.registry, 'user');
            conf.save('user', function(err){
                if(err){
                    printErr(err);
                    process.exit(1);
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
        process.exit(1);
    }
}

function onDel(name){
    var customRegistries = getCustomRegistry();
    if(!customRegistries.hasOwnProperty(name)){
        return;
    }

    delete customRegistries[name];
    setCustomRegistry(customRegistries, function(err){
        if(err){
            printErr(err);
            process.exit(1);
        }
        printMsg([
            ''
            , '    delete registry ' + name + ' success'
            , ''
        ]);
    });
}

function onAdd(name, url, home){
    var customRegistries = getCustomRegistry();
    if(customRegistries.hasOwnProperty(name)){
        return;
    }

    var config = customRegistries[name] = {};
    config.registry = url;
    if(home){
        config.home = home;
    }

    setCustomRegistry(customRegistries, function(err){
        if(err){
            printErr(err);
            process.exit(1);
        }
        printMsg([
            ''
            , '    add registry ' + name + ' success'
            , ''
        ]);
    });
}

function onHome(name, brower){
    var allRegistries = getAllRegistry();
    if(!allRegistries.hasOwnProperty(name)){
        return;
    }
    var registry = allRegistries[name];
    if(!registry.hasOwnProperty('home')){
        return;
    }
    var args = [registry.home];
    if(brower){
        args.push(brower);
    }
    open.apply(null, args);
}

function getCustomRegistry(){
    var file = path.join(process.env.HOME, '.nrmrc');
    if(fs.existsSync(file)){
        return ini.parse(fs.readFileSync(file, 'utf-8'));
    }else{
        return {};
    }
}

function setCustomRegistry(config, cbk){
    var file = path.join(process.env.HOME, '.nrmrc');
    echo(ini.stringify(config), '>', file, cbk);
}

function getAllRegistry(){
    return extend(registries, getCustomRegistry());
}

function printErr(err){
    console.error('an error occured: ' + err);
}

function printMsg(infos){
    infos.forEach(function(info){
        console.log(info);
    });
}

function line (str, len) {
    var line = new Array(len - str.length).join('-');
    return ' ' + line + ' ';
}
