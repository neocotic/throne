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
const debug = require('debugged').create('throne');
const EventEmitter = require('events').EventEmitter;
const trim = require('lodash.trim');

const ServiceManager = require('./service/ServiceManager');

const _checkService = Symbol('checkService');
const _checkServices = Symbol('checkServices');
const _generateReport = Symbol('generateReport');
const _serviceManager = Symbol('serviceManager');

/**
 * Can check the availability of a name across many supported services of varying categories.
 *
 * Services are loaded dynamically on-demand and cached to avoid unnecessary subsequent loads for each instance of
 * <code>Throne</code> so it's recommended to reuse the same instance to avoid performance issues.
 */
class Throne extends EventEmitter {

  /**
   * Creates an instance of {@link Throne}.
   *
   * @public
   */
  constructor() {
    super();

    this[_serviceManager] = new ServiceManager();

    debug.log('Initialized Throne');
  }

  /**
   * Checks the availability of the specified <code>name</code> across all supported services using the
   * <code>options</code> provided.
   *
   * <code>name</code> is trimmed and transformed into lower case before being checked by any service.
   *
   * The <code>filter</code> option can be used to control the services in which <code>name</code> is to be checked
   * based on their descriptor.
   *
   * This method returns a <code>Promise</code> that is resolved with a report once all services have been checked.
   * However, progress can be monitored by listening to events that are emitted by this {@link Throne}.
   *
   * @param {string} name - the name to be checked
   * @param {Throne~CheckOptions} [options] - the options to be used
   * @return {Promise.<Error, Throne~Report>} A <code>Promise</code> for the report generated for all of the results.
   * @fires Throne#check
   * @fires Throne#checkservice
   * @fires Throne#report
   * @fires Throne#result
   * @public
   */
  check(name, options) {
    if (!options) {
      options = {};
    }

    name = trim(name).toLowerCase();

    debug.log('Checking "%s" using options: %o', name, options);

    return this[_serviceManager].get({ filter: options.filter })
      .then((services) => this[_checkServices](name, options, services))
      .then((results) => this[_generateReport](name, results));
  }

  /**
   * Provides the list of all supported services using the <code>options</code> provided.
   *
   * The <code>filter</code> option can be used to control which services are included in the result based on their
   * descriptor.
   *
   * @param {Throne~ListOptions} [options] - the options to be used
   * @return {Promise.<Error, Array.<Service~Descriptor>>} A <code>Promise</code> for the supported service descriptors.
   * @public
   */
  list(options) {
    if (!options) {
      options = {};
    }

    debug.log('Listing services and categories using options: %o', options);

    return this[_serviceManager].get({ filter: options.filter })
      .then((services) => services.map((service) => service.descriptor));
  }

  [_checkService](name, options, service) {
    const descriptor = service.descriptor;

    debug.log('Checking "%s" using %s service under %s category', name, descriptor.title, descriptor.category);

    /**
     * The "checkservice" event is fired immediately before a service is checked.
     *
     * @event Throne#checkservice
     * @type {Object}
     * @property {string} category - The category to which the service belongs.
     * @property {string} name - The name to be checked.
     * @property {string} title - The title of the service.
     */
    this.emit('checkservice', Object.assign({ name }, descriptor));

    return service.check(name, { timeout: options.timeout })
      .then((available) => {
        const result = Object.assign({
          available,
          error: null,
          name
        }, descriptor);

        debug.log('Check succeeded for "%s" using %s service: %o', name, descriptor.title, result);

        return result;
      })
      .catch((error) => {
        const result = Object.assign({
          available: null,
          error: error instanceof Error ? error : new Error(error),
          name
        }, descriptor);

        debug.log('Check failed for "%s" using %s service: %o', name, descriptor.title, result);

        return result;
      })
      .then((result) => {
        /**
         * The "result" event is fired immediately after a service is checked along with its findings.
         *
         * @event Throne#result
         * @type {Throne~Result}
         */
        this.emit('result', result);

        return result;
      });
  }

  [_checkServices](name, options, services) {
    if (!services.length) {
      return Promise.reject(new Error('No services found'));
    }

    /**
     * The "check" event is fired once the services have been loaded (and potentially filtered) but before any services
     * are checked.
     *
     * @event Throne#check
     * @type {Object}
     * @property {string} name - The name to be checked.
     * @property {Service~Descriptor[]} services - The descriptors for all services to be checked.
     */
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
    debug.log('Generating report for "%s" based on results: %o', name, results);

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

    debug.log('Report generated for "%s": %o', name, report);

    /**
     * The "report" event is fired once all services have been checked along with a report containing all of their
     * findings, including a summary.
     *
     * @event Throne#report
     * @type {Throne~Report}
     */
    this.emit('report', report);

    return report;
  }

}

module.exports = Throne;

/**
 * The options that can be passed to {@link Throne#check}.
 *
 * @typedef {Object} Throne~CheckOptions
 * @property {ServiceManager~ServiceFilter} [filter] - The function to be used to filter which services are checked
 * based on their descriptor. All services are checked by default.
 * @property {number} [timeout] - The timeout to be applied to each individual service check (in milliseconds). No
 * timeout is applied by default.
 */

/**
 * The options that can be passed to {@link Throne#list}.
 *
 * @typedef {Object} Throne~ListOptions
 * @property {ServiceManager~ServiceFilter} [filter] - The function to be used to filter which services are provided
 * based on their descriptor. All services are provided by default.
 */

/**
 * Contains a summary report of the all service checks.
 *
 * @typedef {Object} Throne~Report
 * @property {Object} stats - A statistical summary of all service check findings.
 * @property {number} stats.available - The number of services on which the name is available.
 * @property {number} stats.failed - The number of services that whose check failed.
 * @property {number} stats.passed - The number of services that whose check passed.
 * @property {number} stats.total - The number of services that were checked.
 * @property {number} stats.unavailable - The number of services on which the name is unavailable.
 * @property {string} name - The name that was checked.
 * @property {Throne~Result[]} results - The results for each individual service check.
 * @property {?boolean} unique - <code>true</code> if the name is available on all services that were checked and
 * <code>false</code> if it was not (will be <code>null</code> if an error occurred during any of the service checks).
 */

/**
 * Contains the result of an individual service check.
 *
 * @typedef {Object} Throne~Result
 * @property {?boolean} available - <code>true</code> if the name is available on the service and <code>false</code> if
 * it's not (may be <code>null</code> if the service was uncertain whether the name was available or if there was an
 * error, so ensure that <code>error</code> is also checked for clarification).
 * @property {string} category - The category to which the service belongs.
 * @property {?Error} error - Any error that occurred while the checking the service (will be <code>null</code> if no
 * error occurred).
 * @property {string} name - The name that was checked.
 * @property {string} title - The title of the service.
 */
