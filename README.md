nrm -- NPM registry manager
===

[![NPM version][npm-image]][npm-url]

`nrm` can help you easy and fast switch between different npm registries,
now include: `npm`, `yarn`, `tencent`,`cnpm`, `taobao`, `npmMirror`.

## How to configure yarn to use private registry ?
just add .yarnrc in your project’s directory and write there:
`registry “http://your.registry”`

Or you can configure it in your HOME directory's .yarnrc


## Install

```
$ npm install -g nrm
```

## Example
```
$ nrm ls

* npm ---------- https://registry.npmjs.org/
  yarn --------- https://registry.yarnpkg.com/
  tencent ------ https://mirrors.cloud.tencent.com/npm/
  cnpm --------- https://r.cnpmjs.org/
  taobao ------- https://registry.npmmirror.com/
  npmMirror ---- https://skimdb.npmjs.com/registry/

```

```
$ nrm use cnpm  //switch registry to cnpm

    Registry has been set to: http://r.cnpmjs.org/

```

## Usage

```
Usage: nrm [options] [command]

Options:
  -V, --version                    output the version number
  -h, --help                       display help for command

Commands:
  ls                               List all the registries
  current [options]                Show current registry name or URL
  use <name>                       Change current registry
  add <name> <url> [home]          Add custom registry
  login [options] <name> [base64]  Set authorize information for a custom registry with a base64 encoded string or username
                                   and password
  set-hosted-repo <name> <repo>    Set hosted npm repository for a custom registry to publish package
  set-scope <scopeName> <url>      Associating a scope with a registry
  del-scope <scopeName>            Remove a scope
  set [options] <name>             Set a custom registry attribute
  rename <name> <newName>          Change custom registry name
  del <name>                       Delete custom registry
  home <name> [browser]            Open the homepage of registry with optional browser
  test [registry]                  Show response time for specific or all registries
  help [command]                   display help for command
```

## Registries

* [npm](https://www.npmjs.org)
* [yarn](https://yarnpkg.com)
* [cnpm](http://cnpmjs.org)
* [taobao](https://npmmirror.com)

## Related Projects

* [verdaccio--A lightweight private npm proxy registry](https://verdaccio.org/)

## TODO 

1. Add more registry: github, [sonatype](https://help.sonatype.com/repomanager3/formats/npm-registry), [sap](https://help.sap.com/viewer/4505d0bdaf4948449b7f7379d24d0f0d/2.0.03/en-US/726e5d41462c4eb29eaa6cc83ff41e84.html)


## Notice

When you are using preset registries the `publish` command will proxy to the npm official registry.
When you are using a custom registry you will need to run the `set-hosted-repo` to set a url to publish pacakges to your hosted registry.

## Maintainer is wanted

If you find nrm is useful and is a experienced node.js developer, then you can help maintain nrm.
If you have the interest you can reach me through email: pana.wang@outlook.com

## Contributors 

* [EmilyMew](https://github.com/EmilyMew)

## LICENSE
MIT


[npm-image]: https://img.shields.io/npm/v/nrm.svg?style=flat-square
[npm-url]: https://npmjs.org/package/nrm
