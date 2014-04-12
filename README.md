nrm
===

`nrm` is short for `npm registry manager`. can help you easy and fast switch between
different npm registries, now include: `npm`, `cnpm`, `eu`,  `au`, `sl(strongloop)`, `nj(nodejitsu)`.

Recently npm has some problem frequently, `nrm` will be helpful to all noders.

## Install

```
$ npm install -g nrm
```

## Example
```
$ nrm ls

* npm ---- https://registry.npmjs.org/
  cnpm --- http://r.cnpmjs.org/
  eu ----- http://registry.npmjs.eu/
  au ----- http://registry.npmjs.org.au/
  sl ----- http://npm.strongloop.com/
  nj ----- https://registry.nodejitsu.com/
```

```
$ nrm use cnpm  //switch registry to cnpm

    Registry has been set to: http://r.cnpmjs.org/

```

## Usage

```
Usage: nrm [options] [command]

  Commands:

    ls                     list all the registries
    use <registry>         change registry to registry
    add <registry> <url> [home] add one custom registry
    del <registry>         delete one custom registry
    help                   print this help

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

## Registries

* [npm](https://www.npmjs.org)
* [cnpm](http://cnpmjs.org)
* [strongloop](http://strongloop.com)
* [european](http://npmjs.eu)
* [australia](http://npmjs.org.au)
* [nodejitsu](https://www.nodejitsu.com)

## LICENSE
MIT
