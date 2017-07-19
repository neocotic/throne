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

const async = require('async');
const debug = require('debug')('throne');
const EventEmitter = require('events').EventEmitter;

const ServiceManager = require('./service/ServiceManager');

const _checkService = Symbol('checkService');
const _checkServices = Symbol('checkServices');
const _generateReport = Symbol('generateReport');
const _serviceManager = Symbol('serviceManager');

/**
 * TODO: Document
 */
class Throne extends EventEmitter {

  /**
   * TODO: Document
   *
   * @public
   */
  constructor() {
    super();

    this[_serviceManager] = new ServiceManager();

    debug('Initialized Throne');
  }

  /**
   * TODO: Document
   *
   * @param {string} name -
   * @param {Throne~Options} [options] -
   * @return {Promise.<Error, Throne~Report>}
   * @public
   */
  check(name, options) {
    if (!options) {
      options = {};
    }

    debug('Checking "%s" using options: %o', name, options);

    return this[_serviceManager].get({ filter: options.filter })
      .then((services) => this[_checkServices](name, options, services))
      .then((results) => this[_generateReport](name, results));
  }

  /**
   * TODO: Document
   *
   * @return {Promise.<Error, Array.<Service~Descriptor>>}
   * @public
   */
  getServiceDescriptors() {
    return this[_serviceManager].get()
      .then((services) => services.map((service) => service.descriptor));
  }

  [_checkService](name, options, service) {
    const descriptor = service.descriptor;

    debug('Checking "%s" using %s service under %s category', name, descriptor.title, descriptor.category);

    this.emit('checkservice', Object.assign({ name }, descriptor));

    return service.check({ name, timeout: options.timeout })
      .then((available) => {
        const result = Object.assign({
          available,
          error: null,
          name
        }, descriptor);

        debug('Check succeeded for "%s" using %s service: %o', name, descriptor.title, result);

        this.emit('result', result);

        return result;
      })
      .catch((error) => {
        const result = Object.assign({
          available: null,
          error: error instanceof Error ? error : new Error(error),
          name
        }, descriptor);

        debug('Check failed for "%s" using %s service: %o', name, descriptor.title, result);

        this.emit('result', result);

        return result;
      });
  }

  [_checkServices](name, options, services) {
    if (!services.length) {
      return Promise.reject(new Error('No services found'));
    }

    this.emit('check', {
      name,
      services: services.map((service) => service.descriptor)
    });

    return new Promise((resolve, reject) => {
      async.mapSeries(
        services,
        async.asyncify((service) => this[_checkService](name, options, service)),
        (error, results) => {
          if (error) {
            reject(error);
          } else {
            resolve(results);
          }
        }
      );
    });
  }

  [_generateReport](name, results) {
    debug('Generating report for "%s" based on results: %o', name, results);

    const stats = {
      available: 0,
      failed: 0,
      passed: 0,
      total: results.length,
      unavailable: 0
    };

    for (const result of results) {
      if (result.error) {
        stats.failed++;
      } else {
        stats.passed++;

        if (result.available) {
          stats.available++;
        } else {
          stats.unavailable++;
        }
      }
    }

    const report = {
      name,
      results,
      stats,
      unique: stats.failed ? null : stats.available === stats.passed
    };

    debug('Report generated for "%s": %o', name, report);

    this.emit('report', report);

    return report;
  }

}

module.exports = Throne;

/**
 * TODO: Document
 *
 * @typedef {Object} Throne~CheckEvent
 * @property {string} name -
 * @property {Service~Descriptor[]} services -
 */

/**
 * TODO: Document
 *
 * @typedef {Object} Throne~CheckServiceEvent
 * @property {string} category -
 * @property {string} name -
 * @property {string} title -
 */

/**
 * TODO: Document
 *
 * @typedef {Object} Throne~Options
 * @property {ServiceManager~ServiceFilter} [filter] -
 * @property {number} [timeout] -
 */

/**
 * TODO: Document
 *
 * @typedef {Object} Throne~Report
 * @property {Object} stats -
 * @property {number} stats.available -
 * @property {number} stats.failed -
 * @property {number} stats.passed -
 * @property {number} stats.total -
 * @property {number} stats.unavailable -
 * @property {string} name -
 * @property {Throne~Result[]} results -
 * @property {?boolean} unique -
 */

/**
 * TODO: Document
 *
 * @typedef {Object} Throne~Result
 * @property {?boolean} available -
 * @property {string} category -
 * @property {?Error} error -
 * @property {string} name -
 * @property {string} title -
 */
