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

## cmd

```
nrm help       // show help
nrm list       // show all registries
nrm use cnpm   // switch to cnpm
nrm home       // go to a registry home page

```



## Registries

* [npm](https://www.npmjs.org)
* [cnpm](http://cnpmjs.org)
* [strongloop](http://strongloop.com)
* [european](http://npmjs.eu)
* [australia](http://npmjs.org.au)
* [nodejitsu](https://www.nodejitsu.com)

## TODO

* enable registry adding
* add more registries


## LICENSE
MIT
