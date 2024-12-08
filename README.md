nrm -- npm registry manager
===

<p>
  <img src="https://img.shields.io/github/package-json/v/Pana/nrm" alt="version">
  <img src="https://img.shields.io/github/stars/Pana/nrm" alt="stars">
  <img src="https://img.shields.io/github/license/Pana/nrm" alt="license">
</p>

`nrm` can help you switch different npm registries easily and quickly. It supports
`npm`, `cnpm`, `taobao`, `yarn`, `tencent`, `npmMirror` and `huawei`.


## Install

```
# npm
npm install -g nrm

# yarn 
yarn global add nrm

# pnpm
pnpm add -g nrm
```

## Example
```
$ nrm ls

* npm ---------- https://registry.npmjs.org/
  yarn --------- https://registry.yarnpkg.com/
  tencent ------ https://mirrors.tencent.com/npm/
  cnpm --------- https://r.cnpmjs.org/
  taobao ------- https://registry.npmmirror.com/
  npmMirror ---- https://skimdb.npmjs.com/registry/
  huawei ------- https://repo.huaweicloud.com/repository/npm/

```

```
$ nrm use taobao

SUCCESS The registry has been changed to 'taobao'.
```

## Usage

> [!TIP]
> The lowest node version is ***18*** from ***v1.4.0***.

```
Usage: nrm [options] [command]

  Commands:

    ls                                    List all the registries
    current                               Show current registry name
      -u  --show-url                        Show the registry URL instead of the name
    use [registry]                        Change registry to registry
      -l  --local                           Switch local registry
    add <registry> <url> [home]           Add one custom registry
    login <registry> [value]              Set authorize information for a registry with a base64 encoded string or username and password
      -a  --always-auth                     Set is always auth
      -u  --username <username>             Your user name for this registry
      -p  --password <password>             Your password for this registry
      -e  --email <email>                   Your email for this registry
    set-hosted-repo <registry> <value>    Set hosted npm repository for a custom registry to publish packages
    set-scope <scopeName> <value>         Associating a scope with a registry
    del-scope <scopeName>                 Remove a scope
    set <registryName>                    Set custom registry attribute
      -a  --attr <attr>                    Set custom registry attribute
      -v  --value <value>                  Set custom registry value
    del [registry]                        Delete one custom registry
    rename <registryName> <newName>       Set custom registry name
    home <registry> [browser]             Open the homepage of registry with optional browser
    publish [<tarball>|<folder>]          Publish package to current registry if current registry is a custom registry. The field 'repository' of current custom registry is required running this command. If you're not using custom registry, this command will run npm publish directly
      -t  --tag [tag]                        Add tag
      -a  --access <public|restricted>       Set access
      -o  --otp [otpcode]                    Set otpcode
      -dr --dry-run                          Set is dry run
    test [registry]                       Show the response time for one or all registries
    help [command]                        Display help for command

  Options:

    -h  --help     output usage information
    -V  --version  output the version number
```

## Registries

* [npm](https://www.npmjs.org)
* [yarn](https://yarnpkg.com)
* [tencent](https://mirrors.tencent.com)
* [cnpm](http://cnpmjs.org)
* [npmMirror](https://skimdb.npmjs.com/)
* [taobao](https://npmmirror.com)
* [huawei](https://www.huaweicloud.com/special/npm-jingxiang.html)

## How to configure yarn to use private registry ?

just add .yarnrc in your project’s directory and write there:
`registry "http://your.registry"`

Or you can configure it in your HOME directory's .yarnrc

## Related Projects

* [verdaccio--A lightweight private npm proxy registry](https://verdaccio.org/)

## TODO 

1. Add more registries: github, [sonatype](https://help.sonatype.com/repomanager3/formats/npm-registry)

## Notice

When you are using preset registries the `publish` command will proxy to the npm official registry.

When you are using a custom registry you will need to run the `set-hosted-repo` to set a url to publish packages to your hosted registry.

## Maintainer is wanted

If you find nrm is useful and are an experienced node.js developer, then you can help maintain nrm.

If you have the interest, you can reach me through email: pana.wang@outlook.com

## Contributors

<a href="https://github.com/Pana/nrm/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=Pana/nrm" />
</a>

## LICENSE

[MIT](LICENSE)
