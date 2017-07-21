# Contributing

If you have any questions about [Throne](https://github.com/neocotic/throne) please feel free to
[raise an issue](https://github.com/neocotic/throne/issues/new).

Please [search existing issues](https://github.com/neocotic/throne/issues) for the same feature and/or issue before
raising a new issue. Commenting on an existing issue is usually preferred over raising duplicate issues.

Please ensure that all files conform to the coding standards, using the same coding style as the rest of the code base.
This can easily be checked via command-line:

``` bash
# install/update package dependencies
$ npm install
# run test suite
$ npm test
```

You must have at least [Node.js](https://nodejs.org) version 6 or newer and [npm](https://npmjs.com) installed version 5
or newer installed.

All pull requests should be made to the `develop` branch.

Don't forget to add your details to the list of
[AUTHORS.md](https://github.com/neocotic/throne/blob/master/AUTHORS.md) if you want your contribution to be recognized
by others.

## Adding a new service

If you'd like to add support for a new service, it really couldn't be easier. Simply look through the `src/service`
directory for examples. Each sub-directory is a service "category". Find one that suits the service that you'd like to
support and create a file in it for the service. If no category exists that matches your service, simply create a new
directory for a new category. However, the service file name **must** match the pattern
`src/service/CATEGORY/*Service.js`, where the prefix for the file name should represent the service name, although how
the service is displayed and filtered depends on the title that's use in the implementation (again, see the other
examples) for help.

The file should export a single value; a reference to a class that extends `src/service/Service.js`.

Throne does the rest for you and will automatically discover and load it at runtime.

You probably want to repeatedly invoke your service while testing it out. If so, try the following from the root
directory:

``` bash
$ ./bin/throne check -d --stack -s SERVICE NAME
``` 

This will only run your service and will output debug information and include stack traces in any errors that occur,
making testing and debugging issues much faster and easier.
