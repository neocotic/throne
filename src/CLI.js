/*
 * Copyright (C) 2017 Alasdair Mercer
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

/* eslint "no-process-exit": "off" */

const chalk = require('chalk');
const Command = require('commander').Command;
const debug = require('debug')('throne:cli');
const EOL = require('os').EOL;
const groupBy = require('lodash.groupby');
const rightPad = require('right-pad');
const trim = require('lodash.trim');

const pkg = require('../package.json');
const Throne = require('./Throne');

const _checkServices = Symbol('checkServices');
const _command = Symbol('command');
const _createFilter = Symbol('createFilter');
const _errorStream = Symbol('errorStream');
const _listServices = Symbol('listServices');
const _outputStream = Symbol('outputStream');
const _prepareSearchValue = Symbol('prepareSearchValue');
const _printServiceStatus = Symbol('printServiceStatus');
const _sanitizeForSearch = Symbol('sanitizeForSearch');

/**
 * TODO: Document
 */
class CLI {

  static [_createFilter](categories, services) {
    const excludedCategories = new Set();
    const excludedServices = new Set();
    const includedCategories = new Set();
    const includedServices = new Set();

    categories.forEach((category) => CLI[_prepareSearchValue](category, excludedCategories, includedCategories));
    services.forEach((service) => CLI[_prepareSearchValue](service, excludedServices, includedServices));

    if (!excludedCategories.size && !excludedServices.size && !includedCategories.size && !includedServices.size) {
      return null;
    }

    return (descriptor) => {
      const category = CLI[_sanitizeForSearch](descriptor.category);
      const service = CLI[_sanitizeForSearch](descriptor.title);

      if (excludedCategories.size > 0 && excludedCategories.has(category)) {
        return false;
      }
      if (excludedServices.size > 0 && excludedServices.has(service)) {
        return false;
      }
      if (includedCategories.size > 0 && !includedCategories.has(category)) {
        return false;
      }
      if (includedServices.size > 0 && !includedServices.has(service)) {
        return false;
      }
      return true;
    };
  }

  static [_prepareSearchValue](value, excludes, includes) {
    value = trim(value);

    const sanitized = CLI[_sanitizeForSearch](value);

    if (value[0] === ':') {
      excludes.add(sanitized);
    } else {
      includes.add(sanitized);
    }
  }

  static [_sanitizeForSearch](str) {
    return str.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  }

  /**
   * TODO: Document
   *
   * @param {CLI~Options} [options] -
   * @public
   */
  constructor(options) {
    if (!options) {
      options = {};
    }

    this[_errorStream] = options.errorStream || process.stderr;
    this[_outputStream] = options.outputStream || process.stdout;
    this[_command] = new Command()
      .version(pkg.version)
      .option('-c, --category <name>', 'filter services by category name', (c, list) => list.concat(c), [])
      .option('-s, --service <title>', 'filter service by title', (s, list) => list.concat(s), [])
      .option('--stack', 'print stack traces for errors');

    this[_command].command('check <name>')
      .alias('chk')
      .description('check name availability')
      .option('-t, --timeout <ms>', 'control timeout for each check', parseInt)
      .action((name, command) => {
        name = trim(name).toLowerCase();

        if (name) {
          this[_checkServices](name, {
            categories: this[_command].category,
            services: this[_command].service,
            showStack: this[_command].stack,
            timeout: command.timeout
          });
        } else {
          this[_command].help();
        }
      });

    this[_command].command('help [cmd]')
      .description('display help for [cmd]')
      .action((cmd) => {
        cmd = trim(cmd).toLowerCase();

        if (cmd) {
          const subCommand = this[_command].commands.find((command) => {
            return command.name() === cmd || command.alias() === cmd;
          });

          if (subCommand) {
            subCommand.help();
          }
        }

        this[_command].help();
      });

    this[_command].command('list')
      .alias('ls')
      .description('list available services and categories')
      .action(() => {
        this[_listServices]({
          categories: this[_command].category,
          services: this[_command].service,
          showStack: this[_command].stack
        });
      });
  }

  /**
   * TODO: Document
   *
   * @param {string|string[]} [args] -
   * @return {void}
   * @public
   */
  parse(args) {
    if (!args) {
      args = [];
    }

    args = Array.isArray(args) ? args : [ args ];

    debug('Parsing arguments: %o', args);

    this[_command].parse(args);

    if (!this[_command].args.length) {
      this[_command].help();
    }
  }

  [_checkServices](name, options) {
    let maxLength = 0;
    const throne = new Throne();

    throne.addListener('check', (event) => {
      this[_outputStream].write(`Checking availability of name: ${name}${EOL}${EOL}`);

      maxLength = event.services.reduce((acc, descriptor) => {
        return Math.max(acc, `${descriptor.category} > ${descriptor.title}`.length);
      }, 0);

      debug('Calculated maximum length for service descriptor: %d', maxLength);
    });

    throne.addListener('checkservice', (event) => {
      this[_printServiceStatus](event, chalk.dim('CHECKING'), maxLength);
    });

    throne.addListener('result', (event) => {
      let status;
      if (event.error) {
        status = chalk.red('FAILED');
      } else if (event.available == null) {
        status = chalk.yellow('UNKNOWN');
      } else if (event.available) {
        status = chalk.green('AVAILABLE');
      } else {
        status = chalk.yellow('TAKEN');
      }

      this[_outputStream].clearLine();
      this[_outputStream].cursorTo(0);
      this[_printServiceStatus](event, status, maxLength, true);

      if (event.error && options.showStack) {
        this[_errorStream].write(`${event.error.stack}${EOL}`);
      }
    });

    throne.addListener('report', (event) => {
      this[_outputStream].write(`${EOL}${chalk.underline('Summary:')}${EOL}`);
      this[_outputStream].write(`Available on ${event.stats.available}/${event.stats.total} services${EOL}`);
      if (event.stats.failed) {
        this[_outputStream].write(`${event.stats.failed}/${event.stats.total} services failed!${EOL}`);

        if (!options.showStack) {
          this[_outputStream].write(`Try again with the --stack option to print the full stack traces${EOL}`);
        }
      } else {
        this[_outputStream].write(`No services failed!${EOL}`);
      }

      if (event.unique) {
        this[_outputStream].write(`It's truly unique. Grab it quick!${EOL}`);
      }
    });

    return throne.check(name, {
      filter: CLI[_createFilter](options.categories, options.services),
      timeout: options.timeout
    })
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        this[_errorStream].write(`Throne failed: ${options.showStack ? error.stack : error.message}${EOL}`);

        if (!options.showStack) {
          this[_outputStream].write(`Try again with the --stack option to print the full stack trace${EOL}`);
        }

        process.exit(1);
      });
  }

  [_listServices](options) {
    const throne = new Throne();

    return throne.list({ filter: CLI[_createFilter](options.categories, options.services) })
      .then((descriptors) => {
        const categorizedDescriptors = groupBy(descriptors, 'category');
        const categories = Object.keys(categorizedDescriptors).sort();

        this[_outputStream].write(`${descriptors.length} services found within ${categories.length} categories!` +
          `${EOL}${EOL}`);

        categories.forEach((category) => {
          this[_outputStream].write(`${category}:${EOL}`);

          categorizedDescriptors[category].forEach((descriptor) => {
            this[_outputStream].write(` - ${descriptor.title}${EOL}`);
          });
        });

        process.exit(0);
      })
      .catch((error) => {
        this[_errorStream].write(`Throne failed: ${options.showStack ? error.stack : error.message}${EOL}`);

        process.exit(1);
      });
  }

  [_printServiceStatus](descriptor, status, maxLength, endLine) {
    let output = rightPad(`${descriptor.category} > ${descriptor.title}`, maxLength + 6, '.');
    output += chalk.bold(status);
    if (endLine) {
      output += EOL;
    }

    this[_outputStream].write(output);
  }

}

module.exports = CLI;

/**
 * TODO: Document
 *
 * @typedef {Object} CLI~Options
 * @property {Writable} [errorStream=process.stderr] -
 * @property {Writable} [outputStream=process.stdout] -
 */
