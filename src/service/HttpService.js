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

const debug = require('debug')('throne:service');
const defaultsDeep = require('lodash.defaultsdeep');
const HttpStatus = require('http-status-codes');
const pollock = require('pollock');
const request = require('request');

const Service = require('./Service');

const _options = Symbol('options');

/**
 * TODO: Document
 */
class HttpService extends Service {

  /**
   * TODO: Document
   *
   * @param {string} category -
   * @param {string} title -
   * @param {HttpService~Options} [options] -
   * @protected
   */
  constructor(category, title, options) {
    super(category, title);

    this[_options] = options || {};
  }

  /**
   * @override
   */
  check(options) {
    return new Promise((resolve, reject) => {
      const requestHeaders = Object.assign({
        'cache-control': 'no-cache,no-store,must-revalidate,max-age=-1,private',
        'connection': 'keep-alive',
        'expires': '-1'
      }, !this[_options].spoof ? null : {
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-encoding': 'gzip, deflate, br',
        'accept-language': 'en-US,en;q=0.5',
        'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/59.0.3071.115 ' +
          'Safari/537.36'
      });
      const requestOptions = defaultsDeep({}, this.getRequestOptions(options.name), {
        encoding: 'utf8',
        headers: requestHeaders,
        method: 'HEAD',
        timeout: options.timeout
      });

      debug('Sending HTTP request for %s service: %o', this.title, requestOptions);

      request(requestOptions, (error, response) => {
        if (error) {
          debug('HTTP request for %s service failed: %s', this.title, error);

          reject(error);
        } else {
          const statusCode = response.statusCode;

          debug('HTTP request for %s service responded with status code: %d', this.title, statusCode);

          if (this.getAcceptedStatusCodes().indexOf(statusCode) === -1) {
            let statusText;
            try {
              statusText = HttpStatus.getStatusText(statusCode);
            } catch (e) {
              // Do nothing
            }
            let message = `Unexpected status code: ${statusCode}`;
            if (statusText) {
              message += ` - ${statusText}`;
            }

            debug('%s service rejected HTTP response status code: %d (%s)', this.title, statusCode, statusText || '?');

            reject(new Error(message));
          } else {
            try {
              const result = this.checkResponse(options.name, response);

              debug('%s service determined available from HTTP response: %s', this.title, result);

              resolve(result);
            } catch (e) {
              debug('%s service failed when checking HTTP response', this.title);

              reject(e);
            }
          }
        }
      });
    });
  }

  /**
   * TODO: Document
   *
   * @param {string} name -
   * @param {Response} response -
   * @return {boolean}
   * @protected
   */
  checkResponse(name, response) {
    return response.statusCode === 404;
  }

  /**
   * TODO: Document
   *
   * @return {number[]}
   * @protected
   */
  getAcceptedStatusCodes() {
    return [ 200, 404 ];
  }

  /**
   * TODO: Document
   *
   * @param {string} name -
   * @return {Object}
   * @protected
   * @abstract
   */
  getRequestOptions(name) {
    pollock(HttpService, 'getRequestOptions');
  }

}

module.exports = HttpService;

/**
 * TODO: Document
 *
 * @typedef {Object} HttpService~Options
 * @property {boolean} [spoof] -
 */
