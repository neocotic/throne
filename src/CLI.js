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
const _printServiceStatus = Symbol('printServiceStatus');
const _sanitizeForSearch = Symbol('sanitizeForSearch');
const _throne = Symbol('throne');

/**
 * TODO: Document
 */
class CLI {

  static [_createFilter](categories, services) {
    categories = categories.map((category) => CLI[_sanitizeForSearch](trim(category)));
    services = services.map((service) => CLI[_sanitizeForSearch](trim(service)));

    return (descriptor) => {
      if (categories.length > 0 && categories.indexOf(CLI[_sanitizeForSearch](descriptor.category)) === -1) {
        return false;
      }
      if (services.length > 0 && services.indexOf(CLI[_sanitizeForSearch](descriptor.title)) === -1) {
        return false;
      }
      return true;
    };
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
      .arguments('<name>')
      .version(pkg.version)
      .option('-c, --category <name>', 'only check name for services in category', (c, list) => list.concat(c), [])
      .option('-l, --list', 'list available services and categories')
      .option('-s, --service <title>', 'only check name for service', (s, list) => list.concat(s), [])
      .option('-t, --timeout <ms>', 'control timeout for individual service checks', parseInt);
    this[_throne] = new Throne();
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

    const command = this[_command].parse(args);
    const name = trim(command.args[0]);

    if (command.list) {
      this[_listServices]();
    } else if (name) {
      this[_checkServices](name, command.category, command.service, command.timeout);
    } else {
      command.outputHelp();

      process.exit(0);
    }
  }

  [_checkServices](name, categories, services, timeout) {
    let maxLength = 0;

    this[_throne].addListener('check', (event) => {
      this[_outputStream].write(`Checking availability of name: ${name}${EOL}${EOL}`);

      maxLength = event.services.reduce((acc, descriptor) => {
        return Math.max(acc, `${descriptor.category} > ${descriptor.title}`.length);
      }, 0);

      debug('Calculated maximum length for service descriptor: %d', maxLength);
    });

    this[_throne].addListener('checkservice', (event) => {
      this[_printServiceStatus](event, chalk.dim('CHECKING'), maxLength);
    });

    this[_throne].addListener('result', (event) => {
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
    });

    this[_throne].addListener('report', (event) => {
      this[_outputStream].write(`${EOL}${chalk.underline('Summary:')}${EOL}`);
      this[_outputStream].write(`Available on ${event.stats.available}/${event.stats.total} services${EOL}`);
      if (event.stats.failed) {
        this[_outputStream].write(`${event.stats.failed}/${event.stats.total} services failed!${EOL}`);
      } else {
        this[_outputStream].write(`No services failed!${EOL}`);
      }

      if (event.unique) {
        this[_outputStream].write(`It's truly unique. Grab it quick!${EOL}`);
      }
    });

    return this[_throne].check(name, { filter: CLI[_createFilter](categories, services), timeout })
      .then(() => {
        process.exit(0);
      })
      .catch((error) => {
        this[_errorStream].write(`Throne failed: ${error.message}${EOL}`);

        process.exit(1);
      });
  }

  [_listServices]() {
    return this[_throne].getServiceDescriptors()
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
        this[_errorStream].write(`Throne failed: ${error.message}${EOL}`);

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
