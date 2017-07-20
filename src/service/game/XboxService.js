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

const fs = require('fs');
const path = require('path');

const HttpService = require('../HttpService');

/**
 * An implementation of {@link HttpService} that checks whether the name is available on
 * <a href="https://www.xbox.com">Xbox</a>.
 */
class XboxService extends HttpService {

  /**
   * Creates an instance of {@link XboxService} under the specified <code>category</code>.
   *
   * @param {string} category - the category to be used
   * @public
   */
  constructor(category) {
    super(category, 'Xbox');
  }

  /**
   * @override
   * @inheritDoc
   */
  checkResponse(name, response) {
    if (response.statusCode === 500) {
      return true;
    }

    const badAvatarBuffer = fs.readFileSync(path.resolve(__dirname, '..', '..', '..', 'assets', 'service', 'game',
      'xbox-bad-avatar.png'));

    return badAvatarBuffer.equals(response.body);
  }

  /**
   * @override
   * @inheritDoc
   */
  getAcceptedStatusCodes() {
    return [ 200, 500 ];
  }

  /**
   * @override
   * @inheritDoc
   */
  getRequestOptions(name) {
    return {
      method: 'GET',
      uri: `https://avatar-ssl.xboxlive.com/avatar/${encodeURIComponent(name)}/avatarpic-s.png`,
      headers: {
        accept: 'image/png;q=0.9,*/*;q=0.8'
      },
      encoding: null
    };
  }

}

module.exports = XboxService;
