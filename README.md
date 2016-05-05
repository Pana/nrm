nrm(1) -- npm registry manager
===

`nrm` can help you easy and fast switch between different npm registries,
now include: `npm`, `cnpm`, `nj(nodejitsu)`, `rednpm`.

Recently npm has some problem frequently, `nrm` will be helpful to all noders.

## Install

```
$ npm install -g nrm
```

## Example
```
$ nrm ls

* npm -----  https://registry.npmjs.org/
  cnpm ----  http://r.cnpmjs.org/
  taobao --  http://registry.npm.taobao.org/
  nj ------  https://registry.nodejitsu.com/
  rednpm -- http://registry.mirror.cqupt.edu.cn
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

    ls                           list all the registries
    use <registry>               change registry to registry
    add <registry> <url> [home]  add one custom registry
    del <registry>               delete one custom registry
    home <registry> [browser]    open the homepage of registry with optional browser
    test [registry]              show the response time for one or all registries
    help                         print this help

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

## Registries

* [npm](https://www.npmjs.org)
* [cnpm](http://cnpmjs.org)
* [nodejitsu](https://www.nodejitsu.com)
* [taobao](http://npm.taobao.org/)
* [rednpm](http://npm.mirror.cqupt.edu.cn)

## LICENSE
MIT
