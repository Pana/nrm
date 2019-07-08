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
  yarn ----- https://registry.yarnpkg.com
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
    current                               Show current registry name
    use <registry>                        Change registry to registry
    add <registry> <url> [home]           Add one custom registry
    set-auth <registry> [value]           Set authorize information for a custom registry with a base64 encoded string or username and pasword
      -a  --always-auth                     Set is always auth
      -u  --username <username>             Your user name for this registry
      -p  --password <password>             Your password for this registry
    set-email <registry> <value>          Set email for a custom registry
    set-hosted-repo <registry> <value>    Set hosted npm repository for a custom registry to publish packages
    del <registry>                        Delete one custom registry
    home <registry> [browser]             Open the homepage of registry with optional browser
    test [registry]                       Show the response time for one or all registries
    publish [<tarball>|<folder>]          Publish package to current registry if current registry is a custom registry.  if you\'re not using custom registry, this command will run npm publish directly
      -t --tag [tag]                        Add tag
      -a --access <public|restricted>       Set access
      -o --otp [otpcode]                    Set otpcode
      -dr --dry-run                         Set is dry run
    help                                  Print this help

  Options:

    -h, --help     output usage information
    -V, --version  output the version number
```

## Registries

* [npm](https://www.npmjs.org)
* [yarn](https://yarnpkg.com)
* [cnpm](http://cnpmjs.org)
* [nodejitsu](https://www.nodejitsu.com)
* [taobao](http://npm.taobao.org/)


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
