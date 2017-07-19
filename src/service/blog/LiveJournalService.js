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

const HttpService = require('../HttpService');

/**
 * TODO: Document
 */
class LiveJournalService extends HttpService {

  /**
   * TODO: Document
   *
   * @param {string} category -
   * @public
   */
  constructor(category) {
    super(category, 'LiveJournal');
  }

  /**
   * @override
   */
  checkResponse(name, response) {
    // TODO: If 410, purchase may be required to obtain username. How best to report this scenario?
    return response.statusCode !== 200;
  }

  /**
   * @override
   */
  getAcceptedStatusCodes() {
    return [ 200, 404, 410 ];
  }

  /**
   * @override
   */
  getRequestOptions(name) {
    return { uri: `http://@${encodeURIComponent(name)}.livejournal.com` };
  }

}

module.exports = LiveJournalService;