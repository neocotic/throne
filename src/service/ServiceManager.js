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

/* eslint global-require: "off" */

const debug = require('debugged').create('throne:service');
const glob = require('glob');
const path = require('path');
const sortBy = require('lodash.sortby');

const _findServiceFiles = Symbol('findServiceFiles');
const _services = Symbol('services');

/**
 * Manages services that are loaded dynamically on-demand and cached to avoid unnecessary subsequent loads for each
 * instance of <code>ServiceManager</code>. For this reason, it's recommended to reuse the same instance to avoid
 * performance issues.
 *
 * Services are loaded from the <code>service</code> directory and the name of the sub-directories are used as the
 * category name. This approach has been taken to simplify the addition of new services as much as possible.
 */
class ServiceManager {

  /**
   * Creates an instance of {@link ServiceManager}.
   *
   * @public
   */
  constructor() {
    this[_services] = null;
  }

  /**
   * Provides all of the supported services using the <code>options</code> provided.
   *
   * This method will automatically load the services if they have not previously been loaded.
   *
   * The <code>filter</code> option can be used to control which services are included in the result based on their
   * descriptor.
   *
   * @param {ServiceManager~GetOptions} [options] - the options to be used
   * @return {Promise.<Error, Array.<Service>>}  <code>Promise</code> for the supported services.
   * @public
   */
  get(options) {
    if (!options) {
      options = {};
    }

    return this.load()
      .then((services) => {
        if (typeof options.filter === 'function') {
          services = services.filter((service) => options.filter(service.descriptor));
        }

        return services;
      });
  }

  /**
   * Finds and loads all {@link Service} implementations sorted by their category and title.
   *
   * This method returns a <code>Promise</code> that is resolved with the list of all loaded services.
   *
   * If the services have already been loaded by this {@link ServiceManager} (and not unloaded), then this method will
   * simply return them without attempting to load them again.
   *
   * @return {Promise.<Error, Array.<Service>>} A <code>Promise</code> for the loaded services.
   * @public
   */
  load() {
    debug.log('Loading available services');

    if (this[_services]) {
      debug.log('%d services have previously been loaded', this[_services].length);

      return Promise.resolve(this[_services].slice());
    }

    return this[_findServiceFiles]()
      .then((files) => {
        const categories = new Set();
        const services = sortBy(files.map((file) => {
          const category = path.dirname(file);
          const ServiceImpl = require(path.join(__dirname, file));

          categories.add(category);

          const service = new ServiceImpl(category);

          debug.log('Loaded %s service under %s category', service.descriptor.title, service.descriptor.category);

          return service;
        }), [
          (service) => service.descriptor.category.toUpperCase(),
          (service) => service.descriptor.title.toUpperCase()
        ]);

        debug.log('Loaded %d services within %d categories', services.length, categories.size);

        this[_services] = services;

        return services.slice();
      });
  }

  /**
   * Removes all previously loaded services (if any) from this {@link ServiceManager}.
   *
   * This method is primarily intended for testing purposes and it's not expected to be called in any real-world
   * scenario.
   *
   * @return {void}
   * @public
   */
  unload() {
    this[_services] = null;

    debug.log('Unloaded all services');
  }

  [_findServiceFiles]() {
    return new Promise((resolve, reject) => {
      glob('*/*Service.js', { cwd: __dirname }, (error, files) => {
        if (error) {
          reject(error);
        } else {
          resolve(files);
        }
      });
    });
  }

}

module.exports = ServiceManager;

/**
 * The options that can be passed to {@link ServiceManager#get}.
 *
 * @typedef {Object} ServiceManager~GetOptions
 * @property {ServiceManager~ServiceFilter} [filter] - The function to be used to filter which services are provided
 * based on their descriptor. All services are provided by default.
 */

/**
 * Returns whether the service, whose <code>descriptor</code> is provided, is to be included.
 *
 * @callback ServiceManager~ServiceFilter
 * @param {Service~Descriptor} descriptor - the descriptor of the service to be checked
 * @return {boolean} <code>true</code> to include the service; otherwise <code>false</code>.
 */
