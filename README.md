nrm -- NPM registry manager
===

[![NPM version][npm-image]][npm-url]

`nrm` can help you easy and fast switch between different npm registries,
now include: `npm`, `cnpm`, `taobao`, `nj(nodejitsu)`.

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

* npm -----  https://registry.npmjs.org/
  cnpm ----  http://r.cnpmjs.org/
  taobao --  https://registry.npm.taobao.org/
  nj ------  https://registry.nodejitsu.com/
  skimdb -- https://skimdb.npmjs.com/registry

```

```
$ nrm use cnpm  //switch registry to cnpm

    Registry has been set to: http://r.cnpmjs.org/

```

## Usage

```
Usage: nrm [options] [command]

  Commands:

    ls                                    List all the registries
    use <registry>                        Change registry to registry
    add <registry> <url> [home]           Add one custom registry
    set-auth <registry> <value> [always]  Set authorize information for a custom registry
    set-email <registry> <value>          Set email for a custom registry
    set-hosted-repo <registry> <value>    Set hosted npm repository for a custom registry to publish packages
    del <registry>                        Delete one custom registry
    home <registry> [browser]             Open the homepage of registry with optional browser
    test [registry]                       Show the response time for one or all registries
    publish [<tarball>|<folder>]          Publish package to current registry if current registry is a custom registry.  if you\'re not using custom registry, this command will run npm publish directly
    help                                  Print this help

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

## Registries

* [npm](https://www.npmjs.org)
* [cnpm](http://cnpmjs.org)
* [nodejitsu](https://www.nodejitsu.com)
* [taobao](http://npm.taobao.org/)


## Notice

When you use an other registry, you can not use the `publish` command.

## TODO

* When publish proxy to npm official registry

## LICENSE
MIT


[npm-image]: https://img.shields.io/npm/v/nrm.svg?style=flat-square
[npm-url]: https://npmjs.org/package/nrm
