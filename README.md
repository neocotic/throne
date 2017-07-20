    88888888888 888
        888     888
        888     888
        888     88888b.  888d888 .d88b.  88888b.   .d88b.
        888     888 "88b 888P"  d88""88b 888 "88b d8P  Y8b
        888     888  888 888    888  888 888  888 88888888
        888     888  888 888    Y88..88P 888  888 Y8b.
        888     888  888 888     "Y88P"  888  888  "Y8888

[Throne](https://github.com/neocotic/throne) is a [Node.js](https://nodejs.org) module for checking for name
availability across multiple services.

[![Build Status](https://img.shields.io/travis/neocotic/throne/develop.svg?style=flat-square)](https://travis-ci.org/neocotic/throne)
[![Dependency Status](https://img.shields.io/david/neocotic/throne.svg?style=flat-square)](https://david-dm.org/neocotic/throne)
[![Dev Dependency Status](https://img.shields.io/david/dev/neocotic/throne.svg?style=flat-square)](https://david-dm.org/neocotic/throne?type=dev)
[![License](https://img.shields.io/npm/l/throne.svg?style=flat-square)](https://github.com/neocotic/throne/blob/master/LICENSE.md)
[![Release](https://img.shields.io/npm/v/throne.svg?style=flat-square)](https://www.npmjs.com/package/throne)

* [Install](#install)
* [CLI](#cli)
* [API](#api)
* [Bugs](#bugs)
* [Contributors](#contributors)
* [License](#license)

## Install

Install using `npm`:

``` bash
$ npm install --save throne
```

You'll need to have at least [Node.js](https://nodejs.org) 4 or newer.

If you want to use the command line interface, which you probably do, you'll most likely want to install it globally so
that you can run `throne` from anywhere:

``` bash
$ npm install --global throne
```

## CLI

    Usage: throne [options] [command]
  
  
    Options:
  
      -V, --version          output the version number
      -c, --category <name>  filter services by category name
      -d, --debug            enable debug level logging
      -s, --service <title>  filter service by title
      --stack                print stack traces for errors
      -h, --help             output usage information
  
  
    Commands:
  
      check|chk [options] <name>  check name availability
      help [cmd]                  display help for [cmd]
      list|ls                     list available services and categories

The command line interface is the primary intended use for Throne and it's designed to be extremely simple. However,
there's a few pointers that can really be helpful:

1. You can filter multiple services and/or categories at once:
``` bash
# Only check services in mail & social categories
$ throne check -c mail -c social neocotic
# Only check specific services
$ throne check -s bitbucket -s github -s gitlab neocotic
```
2. You can even exclude multiple services and/or categories at once by using a colon prefix:
``` bash
# Only check services in all categories except health
$ throne check -c :health neocotic
# Only check services in social category except LinkedIn 
$ throne check -c social -s :linkedin neocotic
```
3. You don't have to be too precise when targeting services for filtering as all non-alphanumeric (incl. whitespace)
characters are ignored, which means the following have the same result:
``` bash
$ throne check -s getsatisfcation neocotic 
$ throne check -s "Get Satisfaction" neocotic
```

## API

While most of you will be using Throne via its CLI, the API can also be used and is designed to be just as simple to
use. It uses ECMAScript 2015's promises to handle the asynchronous flow:

``` javascript
const throne = require('throne');

throne.check('neocotic')
  .then((report) => {
    if (report.status.failed) {
      console.error(`${report.status.failed} checks failed!`);
    }
    
    console.log(report.stats.available === report.stats.total);
  });
```

It's best to take a look at the code and or inspect the results yourself to see all of the information available.

### `check(name[, options])`

Checks the availability of the specified `name` across all supported services using the `options` provided.

`name` is trimmed and transformed into lower case before being checked by any service.

This method returns a `Promise` that is resolved with a report once all services have been checked. However, progress
can be monitored by listening to events that are emitted by `throne`.

TODO: Document events
TODO: Document options
TODO: Provide example

### `list([options])`

Provides the list of all supported services using the `options` provided.

TODO: Document options
TODO: Provide example

## Bugs

If you have any problems with Throne or would like to see changes currently in development you can do so
[here](https://github.com/neocotic/throne/issues).

## Contributors

If you want to contribute, you're a legend! Information on how you can do so can be found in
[CONTRIBUTING.md](https://github.com/neocotic/throne/blob/master/CONTRIBUTING.md). We want your suggestions and pull
requests!

A list of Throne contributors can be found in [AUTHORS.md](https://github.com/neocotic/throne/blob/master/AUTHORS.md).

## License

See [LICENSE.md](https://github.com/neocotic/throne/raw/master/LICENSE.md) for more information on our MIT license.
