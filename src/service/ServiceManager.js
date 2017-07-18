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

const debug = require('debug')('throne:service');
const glob = require('glob');
const path = require('path');
const sortBy = require('lodash.sortby');

const _findServiceFiles = Symbol('findServiceFiles');
const _services = Symbol('services');

/**
 * TODO: Document
 */
class ServiceManager {

  /**
   * TODO: Document
   *
   * @public
   */
  constructor() {
    this[_services] = null;
  }

  /**
   * TODO: Document
   *
   * @param {ServiceManager~GetOptions} [options] -
   * @return {Promise.<Error, Array.<Service>>}
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
   * TODO: Document
   *
   * @return {Promise.<Error, Array.<Service>>}
   * @public
   */
  load() {
    debug('Loading available services');

    if (this[_services]) {
      debug('%d services have previously been loaded', this[_services].length);

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

          debug('Loaded %s service under %s category', service.descriptor.title, service.descriptor.category);

          return service;
        }), [
          (service) => service.descriptor.category.toUpperCase(),
          (service) => service.descriptor.title.toUpperCase()
        ]);

        debug('Loaded %d services within %d categories', services.length, categories.size);

        this[_services] = services;

        return services.slice();
      });
  }

  /**
   * TODO: Document
   *
   * @return {void}
   * @public
   */
  unload() {
    this[_services] = null;

    debug('Unloaded all services');
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
 * TODO: Document
 *
 * @callback ServiceManager~ServiceFilter
 * @param {Service~Descriptor} descriptor -
 * @return {boolean}
 */

/**
 * TODO: Document
 *
 * @typedef {Object} ServiceManager~GetOptions
 * @property {ServiceManager~ServiceFilter} [filter] -
 */
