/**
 * Cart methods
 * -----------------------------------------------------------------------------
 *
 * @namespace cart
 */

import axios from 'axios';
// date picker component
import flatPickr from 'vue-flatpickr-component';
import 'flatpickr/dist/flatpickr.css';

// IE11 bug: we need to disable cache for this request
const axiosConfig = {
  headers: {
    'Cache-Control': 'must-revalidate',
    'Cache-Control': 'no-cache',
    'Cache-Control': 'no-store',
    Pragma: 'no-cache',
  },
};

const cartMethods = {
  components: {
    flatPickr,
  },

  data() {
    return {
      isCartAjaxed: false,
      loadingEvent: null,
      cart: {},

      // shipping calculator
      countries: window.Countries,
      provinces: null,
      selectedCountry: null,
      selectedProvince: null,
      selectedZip: null,
      zipRequired: false,
      shippingRates: null,
      shippingRatesErrors: null,

      // date picker
      // get more from https://chmln.github.io/flatpickr/options/
      datePickerConfig: {
        wrap: true, // set wrap to true only when using 'input-group'
        altFormat: 'M j, Y',
        altInput: true,
        dateFormat: 'm-d-Y',
        enableTime: false,
        locale: {
          firstDayOfWeek: 1, // start week on Monday
        },
        // minDate: "today",
        minDate: new Date().fp_incr(2), // 2 days from now

        // disable Saturdays and Sundays - disable using a function
        disable: [
          function(date) {
            // must return true to disable
            return (date.getDay() === 6 || date.getDay() === 0);
          },
        ],
      },
    };
  },

  watch: {
    selectedCountry() {
      const selectedCountryObj = app.countries[app.selectedCountry];
      const selectedProvincesObj = selectedCountryObj.province_alternate_names;
      const provincesLength = Object.keys(selectedProvincesObj).length;

      // clear data
      app.shippingRates = null;
      app.shippingRatesErrors = null;
      app.selectedZip = null;

      // set data
      app.zipRequired = selectedCountryObj.zip_required;

      if (provincesLength > 0) {
        app.provinces = selectedProvincesObj;
        // app.selectedProvince = Object.keys(app.provinces)[0]
      } else {
        app.provinces = null;
      }
    },
  },


  methods: {
    _initCart() {
      const isCartAjaxed = $('[data-template="cart"]').data('cart-ajaxed');

      if (isCartAjaxed) {
        app.isCartAjaxed = true;
      }

      app._getCartData();
      // shipping calculator
      app._initShippingCalculator();
    },

    _mergeObjs(def, obj) {
      if (typeof obj === 'undefined') {
        return def;
      } else if (typeof def === 'undefined') {
        return obj;
      }
      for (const i in obj) {
        if (obj[i] != null && obj[i].constructor === Object) {
          def[i] = app._mergeObjs(def[i], obj[i]);
        } else {
          def[i] = obj[i];
        }
      }
      return def;
    },

    _getCartDefault() {
      return axios.get('/cart.js', axiosConfig);
    },

    _getCartExtra() {
      return axios.get('/cart?view=extra.json', axiosConfig);
    },

    /**
     * Get the cart data json object
     */
    _getCartData() {
      // we make our own enhanced version of the cart object.
      // we are merging Shopify's default cart object
      // and some more additional data like product options and metafields
      // eslint-disable-next-line promise/catch-or-return
      axios.all([app._getCartDefault(), app._getCartExtra()])
        .then(axios.spread((basic, extra) => {
          // Both requests are now complete
          const basicCartData = basic.data;
          const mergedItems = app._mergeObjs(basic.data.items, extra.data.items);
          basicCartData.items = mergedItems;

          basicCartData.items.forEach((item) => {
            if (!item.properties) {
              item.properties = [];
            }
          });

          app.cart = basicCartData;
          app._initCartUpsells();
          app._initCartPromos();
        }));
    },

    /**
     * Event to add a variant to the cart
     * adds item properties from hidden fields automatically
     *
     * @param  {number} variantId - current variant id
     */
    _addToCart(variantId, event) {
      const $form = $(event.currentTarget).closest(app.selectors.productForm);
      const $qtyEl = $form.find(app.selectors.qtyInput);
      const qtyValue = $qtyEl.val() || 1;
      const productCartLimit = $(event.currentTarget).attr('data-cart-limit') || null;
      const cartProduct = app.cart.items.find((x) => x.variant_id === variantId);
      const totalQty = (cartProduct ? Number(qtyValue) + Number(cartProduct.quantity) : qtyValue);
      const properties = {};
      const productAddons = app.storeUtilities.productAddons.products;
      Shopify.queue = [];

      // add cart limit property
      if (productCartLimit) {
        properties.cart_limit = productCartLimit;
      }

      // check if item has product limit assigned
      if (app._productHasCartLimit(totalQty, productCartLimit)) {
        return;
      }

      app.isLoading = true;
      app.loadingEvent = 'cartAdding';

      // Pass all properties to the cart line item
      $.each($('input[name*="properties"]').serializeArray(), function() {
        const name = this.name.replace('properties[', '').replace(']', '');
        properties[name] = this.value;
      });

      // ReCharge Integration
      // if product is a subscription one use the reCharge Discount VariantId
      if ('subscription_id' in properties) {
        properties.shipping_interval_frequency = $('[name="properties[shipping_interval_frequency]"]').val();
        variantId = app.reChargeDiscountVariantId;
      }

      // push the default variantId to the Shopify queue
      Shopify.queue.push({
        variantId,
      });

      // if there are selected product add-ons
      // push them also to the Shopify queue
      if (productAddons.length > 0) {
        productAddons.forEach((product) => {
          if (product.selected) {
            Shopify.queue.push({
              variantId: product.variants[0].id,
            });
          }
        });
      }

      Shopify.moveAlong = function() {
        // If we still have requests in the queue, let's process the next one.
        if (Shopify.queue.length) {
          const request = Shopify.queue.shift();

          axios.post('/cart/add.js', {
            quantity: qtyValue,
            id: request.variantId,
            properties,
          })
            .then((response) => {
              Shopify.moveAlong();
              return response.data;
            })
            .catch((error) => {
              // console.log(error)
              if (Shopify.queue.length) {
                Shopify.moveAlong();
              }
              throw error;
            });
        } else {
          if (app.currentTemplate === 'cart' && !app.isCartAjaxed) {
            location.reload();
          }

          app._getCartData();
          app._vibrateDevice();
          $qtyEl.val(1); // reset qty input to 1
          app.$snotify.clear();
          $('[data-template="quickshop"]').modal('hide');

          setTimeout(() => {
            app.isLoading = false;
            app.loadingEvent = null;

            if (app.storeUtilities.cartUpsells.settings.showOnPopUp) {
              const recentItem = app.cart.items.find((x) => x.variant_id === variantId);
              app._openModalCartUpsell(recentItem);
            } else {
              app._toggleCartDrawer();
            }

          }, 500);
        }
      };
      Shopify.moveAlong();
    },

    /**
     * Event to remove a variant from the cart
     *
     * @param  {number} itemId - line item index
     */
    _removeFromCart(itemIndex, event) {
      const $cartItem = $(event.currentTarget).parentsUntil(app.selectors.cartItem).parent();

      app.isLoading = true;
      $cartItem.addClass('updating');

      axios.post('/cart/change.js', {
        quantity: 0,
        line: itemIndex,
      })
        .then((response) => {
          app.isLoading = false;
          app._getCartData();
          $('[data-toggle="tooltip"]').tooltip('hide');
          return response;
        })
        .catch((error) => {
          // console.log(error)
          throw error;
        });
    },

    /**
     * Event to update a variant in the cart
     *
     * @param  {number} itemIndex - line item index
     */
    _updateCart(itemIndex, event) {
      const $qtyEl = $(event.currentTarget).parentsUntil(app.selectors.qtyContainer).find(app.selectors.qtyInput);
      const $cartItem = $(event.currentTarget).closest(app.selectors.cartItem);
      const productCartLimit = $cartItem.data('cart-limit') || null;
      let qtyValue = $qtyEl.val();

      if ($(event.currentTarget).data('qty-decrease') !== undefined) {
        if (parseFloat(qtyValue) >= 2) {
          qtyValue = parseFloat(qtyValue) - 1;
        }
      } else if ($(event.currentTarget).data('qty-increase') !== undefined) {
        qtyValue = parseFloat(qtyValue) + 1;

        // check if item has product limit assigned
        if (app._productHasCartLimit(qtyValue, productCartLimit)) {
          return;
        }
      }

      app.isLoading = true;
      $cartItem.addClass('updating');

      $($qtyEl).parent().css({
        'pointer-events': 'none',
      });

      axios.post('/cart/change.js', {
        quantity: qtyValue,
        line: itemIndex,
      })
        .then((response) => {
          app._getCartData();
          app.isLoading = false;
          $cartItem.removeClass('updating');
          $($qtyEl).parent().css({
            'pointer-events': 'inherit',
          });
          return response;
        })
        .catch((error) => {
          // console.log(error)
          throw error;
        });
    },

    _productHasCartLimit(qtyValue, productCartLimit) {
      // console.log(`qtyValue: ${qtyValue}, productCartLimit: ${productCartLimit}`);
      if (productCartLimit) {
        if (qtyValue > productCartLimit) {
          app.$snotify.warning(`Product cart limit applies for the specific product variant. You can't purchase more than ${productCartLimit} item(s) per order.`, 'Product Limit', {
            timeout: 10000,
            showProgressBar: true,
            closeOnClick: true,
            pauseOnHover: true,
            buttons: [{
              text: 'Close',
              bold: true,
              closeOnClick: true,
              // action: (toast) => {
              //   app.$snotify.remove(toast.id);
              // },
            }],
          });
          return true;
        }
      }
      return false;
    },

    /**
     * ShippingCalculator
     */
    _initShippingCalculator() {
      const $form = $('[data-shipping-calculator]');
      if ($form.length === 0) {
        return;
      }

      const customerCountry = $form.find('select[name="country"]').data('value').trim();
      const customerProvince = $form.find('select[name="province"]').data('value').trim();
      const customerZip = $form.find('input[name="zip"]').data('value').trim();
      const userCountry = app._getCookie('user_country');
      const userProvince = app._getCookie('user_province');
      const today = new Date();
      const expirationDate = new Date();
      expirationDate.setDate(today.getDate() + 7);
      const time = expirationDate.getTime();
      const expireTime = time + 1000 * 36000;
      expirationDate.setTime(expireTime);

      if (customerCountry) { // if is user (is logged-in) show the user data
        app.selectedCountry = customerCountry;
        app.selectedProvince = customerProvince;
        app.selectedZip = customerZip;
      } else if (userCountry !== 'user_country' && userProvince !== 'user_province') { // else if cookie exists get from cookie
        app.selectedCountry = userCountry;
        app.selectedProvince = userProvince;
      } else { // finally if we don't have any data => get info from IP
        axios.get('https://geoip-db.com/json/')
          .then((response) => {
            app.selectedCountry = response.data.country_name;
            app.selectedProvince = response.data.region_name;
            // app.selectedZip = response.data.zip_code

            // set cookies
            document.cookie = `user_country=${response.data.country_name};expires=${expirationDate.toGMTString()};path=/`;
            document.cookie = `user_province=${response.data.region_name};expires=${expirationDate.toGMTString()};path=/`;
            return response;
          })
          .catch((error) => {
            // console.log(error)
            throw error;
          });
      }
    },

    _getCartShippingRates() {
      app.isLoading = true;

      axios.post('/cart/prepare_shipping_rates', {
        shipping_address: {
          country: app.selectedCountry,
          province: app.selectedProvince,
          zip: app.selectedZip,
        },
      })
        .then((response) => {
          app._pollCartShippingRates();
          return response;
        })
        .catch((error) => {
          // console.log(error.response.data)
          app.isLoading = false;
          app.shippingRatesErrors = error.response.data;
          throw error;
        });
    },

    _pollCartShippingRates() {
      axios.get('/cart/async_shipping_rates')
        .then((response) => {
          app.isLoading = false;
          if (response.data && response.data.shipping_rates) {
            app.shippingRates = response.data.shipping_rates;
          }
          return response;
        })
        .catch((error) => {
          // console.log(error)
          throw error;
        });
    },

    /**
     * Vibrate mobile device
     */
    _vibrateDevice() {
      // check for vibration support
      const vibrationEnabled = navigator.vibrate || navigator.webkitVibrate || navigator.mozVibrate || navigator.msVibrate;
      if (vibrationEnabled) {
        navigator.vibrate(100);
      }
    },

  },
};

export default cartMethods;
