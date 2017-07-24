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

const debug = require('debugged').create('throne:service');
const defaultsDeep = require('lodash.defaultsdeep');
const HttpStatus = require('http-status-codes');
const pollock = require('pollock');
const request = require('request');

const Service = require('./Service');

const _options = Symbol('options');

/**
 * An abstract implementation of {@link Service} that makes it easier for service checks that rely on a single HTTP
 * request.
 *
 * The default behavior simply invokes a request (based on options provided by {@link HttpService#getRequestOptions}),
 * waits for a response, and checks that the response has an accepted status code (based on those returned by
 * {@link HttpService#getAcceptedStatusCodes} - <code>200</code> and <code>404</code> by default). The check fails if
 * the status code is not accepted, otherwise {@link HttpService#checkResponse} is called in order to check availability
 * of the name based on the HTTP response (by default this returns <code>true</code> if the status code is
 * <code>404</code>). This behavior is simply the default and is designed to be easily extended/overridden to meet the
 * needs of all services.
 *
 * Some services inspect certain headers for many reasons and will fail to work correctly if these are missing. They are
 * excluded by default, however, the <code>spoof</code> option simply needs to be enabled when the
 * <code>HttpService</code> is initialized for these to be included in the HTTP request.
 *
 * By default, all HTTP requests are sent using the <code>HEAD</code> method using UTF-8 encoding and include the normal
 * headers to indicate that cache should be ignored. All of this, and more, can be changed/overridden via
 * {@link HttpService#getRequestOptions}.
 */
class HttpService extends Service {

  /**
   * Creates an instance of {@link HttpService} under the specified <code>category</code> and with the specified
   * <code>title</code> and using the <code>options</code> provided.
   *
   * Implementations <b>must</b> override this constructor so that they expose a single-argument constructor that only
   * takes <code>category</code> while passing <code>title</code> and <code>options</code> (if any) internally.
   *
   * @param {string} category - the category to be used
   * @param {string} title - the title to be used
   * @param {HttpService~Options} [options] - the options to be used
   * @protected
   */
  constructor(category, title, options) {
    super(category, title);

    this[_options] = options || {};
  }

  /**
   * @override
   * @inheritDoc
   */
  check(name, options) {
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
      const requestOptions = defaultsDeep({}, this.getRequestOptions(name), {
        encoding: 'utf8',
        headers: requestHeaders,
        method: 'HEAD',
        timeout: options.timeout
      });

      debug.log('Sending HTTP request for %s service: %o', this.descriptor.title, requestOptions);

      request(requestOptions, (error, response) => {
        if (error) {
          debug.log('HTTP request for %s service failed: %s', this.descriptor.title, error);

          reject(error);
        } else {
          const statusCode = response.statusCode;

          debug.log('HTTP request for %s service responded with status code: %d', this.descriptor.title, statusCode);

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

            debug.log('%s service rejected HTTP response status code: %d (%s)', this.descriptor.title, statusCode,
              statusText || '?');

            reject(new Error(message));
          } else {
            try {
              const result = this.checkResponse(name, response);

              debug.log('%s service determined available from HTTP response: %s', this.descriptor.title, result);

              resolve(result);
            } catch (e) {
              debug.log('%s service failed when checking HTTP response', this.descriptor.title);

              reject(e);
            }
          }
        }
      });
    });
  }

  /**
   * Checks the specified HTTP <code>response</code> to determine whether the <code>name</code> provided is available.
   *
   * This method should return <code>null</code> if it's uncertain whether <code>name</code> is available.
   *
   * By default, this method simply bases the availability on whether <code>response</code> has a <code>404</code>
   * status code, however, this will obviously not be applicable ot all services, so implementations are free to
   * override this method as-needed to suit their needs.
   *
   * @param {string} name - the name being checked
   * @param {Response} response - the HTTP response
   * @return {?boolean} <code>true</code> if <code>name</code> is available and <code>false</code> if it's not (may be
   * <code>null</code> if it's uncertain whether <code>name</code> is available).
   * @protected
   */
  checkResponse(name, response) {
    return response.statusCode === 404;
  }

  /**
   * Returns the status codes that are accepted by this {@link HttpService}.
   *
   * If the service responds with a status code that does not match any of those returned by this method, then the check
   * will be failed.
   *
   * By default, this method indicates that only <code>200</code> and <code>404</code> status codes are accepted,
   * however, this will obviously not be applicable ot all services, so implementations are free to override this method
   * as-needed to suit their needs.
   *
   * @return {number[]} The HTTP response status codes that are expected.
   * @protected
   */
  getAcceptedStatusCodes() {
    return [ 200, 404 ];
  }

  /**
   * Returns the options to be used to build the HTTP request that will be used to check whether the specified
   * <code>name</code> is available.
   *
   * Implementations <b>must</b> override this method to implement the necessary logic to build the correct request
   * options.
   *
   * @param {string} name - the name to be checked
   * @return {Object} The request options.
   * @protected
   * @abstract
   */
  getRequestOptions(name) {
    pollock(HttpService, 'getRequestOptions');
  }

}

module.exports = HttpService;

/**
 * The options that can be passed to {@link HttpService}.
 *
 * @typedef {Object} HttpService~Options
 * @property {boolean} [spoof] - <code>true</code> to add request headers to help spoof a normal browser request;
 * otherwise <code>false</code>.
 */
