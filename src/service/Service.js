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
 * Can check the availability of a name on a specific service.
 */
class Service {

  /**
   * Creates an instance of {@link Service} under the specified <code>category</code> and with the specified
   * <code>title</code>.
   *
   * Implementations <b>must</b> override this constructor so that they expose a single-argument constructor that only
   * takes <code>category</code> while passing <code>title</code> internally.
   *
   * @param {string} category - the category to be used
   * @param {string} title - the title to be used
   * @protected
   */
  constructor(category, title) {
    this[_category] = category;
    this[_title] = title;
  }

  /**
   * Checks the availability of the specified <code>name</code> on this {@link Service} using the <code>options</code>
   * provided.
   *
   * This method returns a <code>Promise</code> that is resolved with whether <code>name</code> is available on this
   * {@link Service}, however, this indicator may be <code>null</code> if it's uncertain whether <code>name</code> is
   * available.
   *
   * Implementations <b>must</b> override this method to implement the necessary logic to check availability.
   *
   * @param {string} name - the name to be checked
   * @param {Service~CheckOptions} options - the options to be used
   * @return {Promise.<Error, ?boolean>} A <code>Promise</code> for whether <code>name</code> is available.
   * @public
   * @abstract
   */
  check(name, options) {
    pollock(Service, 'check');
  }

  /**
   * Returns the descriptor for this {@link Service}.
   *
   * @return {Service~Descriptor} The descriptor.
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
 * Describes an individual service.
 *
 * @typedef {Object} Service~Descriptor
 * @property {string} category - The category to which the service belongs.
 * @property {string} title - The title of the service.
 */

/**
 * The options that can be passed to {@link Service#check}.
 *
 * @typedef Service~CheckOptions
 * @property {string} name - The name to be checked.
 * @property {?number} timeout - The timeout to be applied to the check (in milliseconds - will be <code>null</code> if
 * no timeout is to be applied).
 */
