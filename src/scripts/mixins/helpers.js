/**
 * Helper methods
 * -----------------------------------------------------------------------------
 *
 * @namespace helpers
 */

import moment from 'moment';
// In case you want to change moment.js locale, here is an example:
/*
import 'moment/locale/en-gb'
moment.locale('en-gb')
*/

const swatchesColorList = JSON.parse($('[data-swatches-colorlist-json]').html());

const helperMethods = {
  methods: {

    /**
     * Helper method for getting the current template
     */
    _getCurrentTemplate() {
      const template = $('[data-template]').data('template');

      switch (template) {
        case 'collection':
          app.currentTemplate = 'collection';
          break;
        case 'product':
          app.currentTemplate = 'product';
          break;
        case 'cart':
          app.currentTemplate = 'cart';
          break;
        case 'account':
          app.currentTemplate = 'account';
          break;
      }
    },

    /**
     * Return an object from an array of objects that matches the provided key and value
     *
     * @param {array} array - Array of objects
     * @param {string} key - Key to match the value against
     * @param {string} value - Value to get match of
     */
    _findInstance(array, key, value) {
      for (let i = 0; i < array.length; i += 1) {
        if (array[i][key] === value) {
          return array[i];
        }
      }
      return null;
    },

    /**
     * Remove an object from an array of objects by matching the provided key and value
     *
     * @param {array} array - Array of objects
     * @param {string} key - Key to match the value against
     * @param {string} value - Value to get match of
     */
    _removeInstance(array, key, value) {
      let i = array.length;
      while (i--) {
        if (array[i][key] === value) {
          array.splice(i, 1);
          break;
        }
      }
      return array;
    },

    /**
     * _.compact from lodash
     * Remove empty/false items from array
     * Source: https://github.com/lodash/lodash/blob/master/compact.js
     *
     * @param {array} array
     */
    _compact(array) {
      let index = -1;
      const length = array == null ? 0 : array.length;
      let resIndex = 0;
      const result = [];

      while (++index < length) {
        const value = array[index];
        if (value) {
          result[resIndex++] = value;
        }
      }
      return result;
    },

    /**
     * Remove duplicates from an array of objects
     * @param arr - Array of objects
     * @param prop - Property of each object to compare
     * @returns {Array}
     */
    _removeDuplicates(arr, key = 'id') {
      const map = new Map();
      // eslint-disable-next-line array-callback-return
      arr.map((el) => {
        if (!map.has(el[key])) {
          map.set(el[key], el);
        }
      });
      return [...map.values()];
    },

    /**
     * _.defaultTo from lodash
     * Checks `value` to determine whether a default value should be returned in
     * its place. The `defaultValue` is returned if `value` is `NaN`, `null`,
     * or `undefined`.
     * Source: https://github.com/lodash/lodash/blob/master/defaultTo.js
     *
     * @param {*} value - Value to check
     * @param {*} defaultValue - Default value
     * @returns {*} - Returns the resolved value
     */
    _defaultTo(value, defaultValue) {
      return value == null ? defaultValue : value;
    },

    /**
     * Format date
     * @param  {string}
     * @return {String} value - formatted value
     */
    _formatDate(value) {
      const date = moment(value).utc().format('MMM D, YYYY');
      return date;
    },

    /**
     * Format money values based on your shop currency settings
     * @param  {Number|string} cents - value in cents or dollar amount e.g. 300 cents
     * or 3.00 dollars
     * @return {String} value - formatted value
     */
    _formatMoney(cents) {
      const app = this;
      const moneyFormat = app.moneyFormat;

      if (typeof cents === 'string') {
        cents = cents.replace('.', '');
      }

      let value = '';
      const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
      const formatString = (moneyFormat);

      function formatWithDelimiters(number, precision, thousands, decimal) {
        precision = app._defaultTo(precision, 2);
        thousands = app._defaultTo(thousands, ',');
        decimal = app._defaultTo(decimal, '.');

        if (isNaN(number) || number === null) {
          return 0;
        }

        number = (number / 100.0).toFixed(precision);

        const parts = number.split('.');
        const dollarsAmount = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, `$1${thousands}`);
        const centsAmount = parts[1] ? (decimal + parts[1]) : '';

        return dollarsAmount + centsAmount;
      }

      switch (formatString.match(placeholderRegex)[1]) {
        case 'amount':
          value = formatWithDelimiters(cents, 2);
          break;
        case 'amount_no_decimals':
          value = formatWithDelimiters(cents, 0);
          break;
        case 'amount_with_space_separator':
          value = formatWithDelimiters(cents, 2, ' ', '.');
          break;
        case 'amount_no_decimals_with_comma_separator':
          value = formatWithDelimiters(cents, 0, ',', '.');
          break;
        case 'amount_no_decimals_with_space_separator':
          value = formatWithDelimiters(cents, 0, ' ');
          break;
        default:
          value = formatWithDelimiters(cents, 2);
      }

      return formatString.replace(placeholderRegex, value);
    },

    /**
     * Gets the text of an element and converts to current currency
     *
     * @returns {*} - Returns the new text (currency) of the element
     */
    _checkCurrencyElements() {
      const $currencyEl = $('[data-currency]');
      const amount = $currencyEl.text() * 100;
      const money = app._formatMoney(amount);
      $currencyEl.text(money);
    },

    /**
     * Converts a string to camelcase
     *
     * @param {*} str - String to check
     * @returns {*} - Returns the resolved string
     */
    _toCamelCase(str) {
      return str.toLowerCase().replace(/(?:(^.)|(\s+.))/g, (match) => ` ${match.charAt(match.length - 1).toUpperCase()}`);
    },

    /**
     * Converts a string as handle
     *
     * @param {*} str - String to check
     * @returns {*} - Returns the resolved string
     */
    _handleize(str) {
      str = str.toLowerCase().replace(/[^\w\u00C0-\u024f]+/g, '-').replace(/^-+|-+$/g, '');
      return str;
    },

    /**
     * Converts a handle to readable friendly format
     *
     * @param {*} str - String to check
     * @returns {*} - Returns the resolved string
     */
    _unhandleize(str) {
      str = str.replace(/-/g, ' ');
      str = this._toCamelCase(str);
      return str;
    },

    /**
     * Truncates a given string
     *
     * @param {String} value - Value to check
     * @param {Number} count - Count number of words
     * @returns {*} - Returns the resolved value
     */
    _truncate(value, count) {
      const strippedString = value.trim();
      const array = strippedString.split(' ');
      value = array.splice(0, count).join(' ');
      if (array.length > count) {
        value += '...';
      }
      return value;
    },

    /**
     * Returns a function, that, as long as it continues to be invoked, will not
     * be triggered. The function will be called after it stops being called for
     * N milliseconds. If `immediate` is passed, trigger the function on the
     * leading edge, instead of the trailing.
     */
    _debounce(func, wait, immediate) {
      let timeout;
      return function() {
        const context = this;
        const args = arguments;

        function later() {
          timeout = null;
          if (!immediate) {
            func.apply(context, args);
          }
        }

        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) {
          func.apply(context, args);
        }
      };
    },

    /**
     * Pre-loads an image in memory and uses the browsers cache to store it until needed.
     *
     * @param {Array} images - A list of image urls
     * @param {String} size - A shopify image size attribute
     */

    _preload(images, size) {
      const app = this;

      if (typeof images === 'string') {
        images = [images];
      }

      for (let i = 0; i < images.length; i += 1) {
        const image = images[i];
        app._loadImage(app._getSizedImageUrl(image, size));
      }
    },

    /**
     * Loads and caches an image in the browsers cache.
     * @param {string} path - An image url
     */
    _loadImage(path) {
      new Image().src = path;
    },

    /**
     * Find the Shopify image attribute size
     *
     * @param {string} src
     * @returns {null}
     */
    _imageSize(src) {
      const match = src.match(/.+_((?:pico|icon|thumb|small|compact|medium|large|grande)|\d{1,4}x\d{0,4}|x\d{1,4})[_\.@]/);

      if (match) {
        return match[1];
      }
      return null;
    },

    /**
     * Adds a Shopify size attribute to a URL
     *
     * @param {string} src
     * @param {string} size
     * @returns {*}
     */
    _getSizedImageUrl(src, size) {
      const app = this;
      let match;

      if (src === null) {
        return;
      }

      if (typeof (src) === 'object') {
        src = src.src;
      }

      if (size === 'master') {
        src = app._removeProtocol(src);
      }

      if (src) {
        match = src.match(/\.(jpg|jpeg|gif|png|bmp|bitmap|tiff|tif)(\?v=\d+)?$/i);
      }

      if (match) {
        const prefix = src.split(match[0]);
        const suffix = match[0];

        src = app._removeProtocol(`${prefix[0]}_${size}${suffix}`);
      }
      return src;
    },

    /**
     * Get swatch hex color code or image url
     *
     * @param {string} colorName
     * @returns {string} hex code
     */
    _getSwatchStyle(colorName) {
      colorName = colorName.replace(/-|\s/g, '').toLowerCase();
      const swatch = swatchesColorList[colorName];
      let swatchStyle;

      if (typeof swatch !== 'undefined') {
        if (swatch.match(/\.(jpeg|jpg|png|gif)/g) != null) {
          swatchStyle = `background-image: url(${swatch})`;
        } else {
          swatchStyle = `background-color: ${swatch}`;
        }
        return swatchStyle;
      }

      return false;
    },

    _removeProtocol(path) {
      return path.replace(/http(s)?:/, '');
    },

    /**
     * Read a stored cookie by name
     *
     * @param {string} name
     * @return {String} value
     */
    _getCookie(name) {
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);

      if (parts.length === 2) {
        name = parts.pop().split(';').shift();
      }
      return name;
    },

    /**
     * Cross browser resize event
     */
    _triggerResize() {
      if (navigator.userAgent.indexOf('MSIE') !== -1 || navigator.appVersion.indexOf('Trident/') > 0) {
        const evt = document.createEvent('UIEvents');
        evt.initUIEvent('resize', true, false, window, 0);
        window.dispatchEvent(evt);
      } else {
        window.dispatchEvent(new Event('resize'));
      }
    },

    /**
     * Get URL parameter
     */
    _getUrlParameter(name) {
      name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
      const regex = new RegExp(`[\\?&]${name}=([^&#]*)`);
      const results = regex.exec(location.search);
      return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    },

  },
};

export default helperMethods;
