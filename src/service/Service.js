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

const pollock = require('pollock');

const _category = Symbol('category');
const _title = Symbol('title');

/**
 * TODO: Document
 */
class Service {

  /**
   * TODO: Document
   *
   * @param {string} category -
   * @param {string} title -
   * @protected
   */
  constructor(category, title) {
    this[_category] = category;
    this[_title] = title;
  }

  /**
   * TODO: Document
   *
   * @param {Service~CheckOptions} options -
   * @return {Promise.<Error, boolean>}
   * @public
   * @abstract
   */
  check(name) {
    pollock(Service, 'check');
  }

  /**
   * TODO: Document
   *
   * @return {Service~Descriptor}
   * @public
   */
  get descriptor() {
    return {
      category: this[_category],
      title: this[_title]
    };
  }

}

module.exports = Service;

/**
 * TODO: Document
 *
 * @typedef {Object} Service~Descriptor
 * @property {string} category -
 * @property {string} title -
 */

/**
 * TODO: Document
 *
 * @typedef Service~CheckOptions
 * @property {string} name -
 * @property {number} timeout -
 */
