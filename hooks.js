#!/usr/bin/env node

const { cleanRegistry }  = require('./cli')

function preuninstall(){
  if(ifNeedClean()){
    console.log('preuninstall run success : clean .nrmrc info')
    return cleanRegistry();
  };
  console.log('preuninstall run success : keep .nrmrc info')
  process.exit();
}

function ifNeedClean(){
  if(process.env.npm_config_clean){
    return true
  }else{
    const envArgv = process.env.npm_config_argv || '{"original":[]}';
    const envOriginal = JSON.parse(envArgv).original;
    return envOriginal.includes('-C')
  }
}

function isLocalDebug(argv){
  let debugTarget = null;
  argv.forEach(item=>{
    // use node hooks.js --LocalDebugging=preuninstall
    if(item.startsWith('--LocalDebugging=')){
      debugTarget = item.split('=')[1]
    }
  })
  return debugTarget;
}


function run (argv) {
  const target = isLocalDebug(argv) || process.env.npm_lifecycle_event;
  switch(target){
    case 'preuninstall':
        preuninstall(argv);break;
    default: process.exit(0)
  }
}

run(process.argv.slice(2));　　
