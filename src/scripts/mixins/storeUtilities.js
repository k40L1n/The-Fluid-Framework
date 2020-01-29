/**
 * Store Utilities Methods
 * -----------------------------------------------------------------------------
 *
 * @namespace storeUtilities
 */

import axios from 'axios';
import Flickity from 'flickity';

const storeUtilitiesMethods = {
  data() {
    return {
      shop: {},
      recentCartItem: null,
      storeUtilities: {
        ready: false,
        loginHelper: {
          settings: {},
          status: null,
          message: null,
          customerEmail: '',
          isLoginFormVisible: true,
        },
        productAddons: {
          settings: {},
          products: [],
          currentProductEnabled: false,
          totalValue: null,
        },
        relatedProducts: {
          settings: {},
          products: [],
          currentProductEnabled: false,
        },
        cartUpsells: {
          settings: {},
          products: [],
        },
        cartPromos: {
          settings: {},
          products: [],
          enablerCodes: [],
          inCartTotalValue: 0,
        },
      },
    };
  },

  methods: {
    async _initStoreUtilities() {
      app.storeUtilities.ready = false;

      if (!window.theme.utilitiesAppEnabled) {
        app.storeUtilities.ready = true;
        return;
      }

      const shopData = await app._getShopData();

      if (!shopData) {
        app.storeUtilities.ready = true;
      }
    },

    async _getShopData() {
      try {
        let shopData;
        let shopSettings;

        shopData = app.$sessionStorage.get('shopData');

        if (!shopData) {
          shopData = await axios.get('/apps/store-utilities-proxy/getShopData');
          app.shop = shopData.data.shop;
          shopSettings = shopData.data.settings.data;
          // pass to session storage to reduce server calls
          app.$sessionStorage.set('shopData', shopData.data);
        } else {
          app.shop = shopData.shop;
          shopSettings = shopData.settings.data;
        }

        app.storeUtilities.loginHelper.settings = shopSettings.loginHelper;
        app.storeUtilities.productAddons.settings = shopSettings.productAddons;
        app.storeUtilities.relatedProducts.settings = shopSettings.relatedProducts;
        app.storeUtilities.cartPromos.settings = shopSettings.cartPromos;
        app.storeUtilities.cartUpsells.settings = shopSettings.cartUpsells;
        app.storeUtilities.ready = true;

        app._initCartUpsells();
        app._setPromosEnablerCodes();

        switch (app.currentTemplate) {
          case 'product':
            app._initProductAddons();
            app._initRelatedProducts();
            break;
          case 'cart':
            app._initCartPromos();
            break;
          case 'account':
            app._initLoginHelper();
            break;
          default:
            // default action
        }
      } catch (error) {
        app.storeUtilities.ready = true;
        // console.log(Object.keys(error), error.message);
      }
    },

    _initLoginHelper() {
      if (!app.storeUtilities.loginHelper.settings.enabled) {
        return;
      }

      let tempCustomerEmail = app.$sessionStorage.get('customer_temp_email');

      if (tempCustomerEmail === 'null') {
        tempCustomerEmail = '';
      }

      app.storeUtilities.loginHelper.customerEmail = tempCustomerEmail;

      // Submit the form if the email field is not empty
      setTimeout(() => {
        if (app.storeUtilities.loginHelper.customerEmail !== '') {
          $('.shopify-warning').hide();
          app._submitLoginHelperForm();
        }
      }, 500);
    },

    async _initProductAddons() {
      if (!app.storeUtilities.productAddons.settings.enabled) {
        return;
      }

      const productAddons = await axios.get(`/apps/store-utilities-proxy/getProductAddons?product_id=${app.product.id}`);
      app.storeUtilities.productAddons.currentProductEnabled = productAddons.data.enabled;
      app.storeUtilities.productAddons.products = productAddons.data.products || [];

      if (app.storeUtilities.productAddons.settings.displayStyle === 'carousel') {
        setTimeout(() => {
          const $carousel = $('[data-flickity-product-addons]');
          if ($carousel.length > 0) {
            const options = $carousel.data('flickity-product-addons');
            const flkty = new Flickity($carousel[0], options);
          }
        }, 100);
      }
    },

    async _initRelatedProducts() {
      if (!app.storeUtilities.relatedProducts.settings.enabled) {
        return;
      }

      const relatedProducts = await axios.get(`/apps/store-utilities-proxy/getRelatedProducts?product_id=${app.product.id}`);
      app.storeUtilities.relatedProducts.currentProductEnabled = relatedProducts.data.enabled;
      app.storeUtilities.relatedProducts.products = relatedProducts.data.products || [];

      if (app.storeUtilities.relatedProducts.settings.displayStyle === 'carousel') {
        setTimeout(() => {
          const $carousel = $('[data-flickity-related-products]');
          if ($carousel.length > 0) {
            const options = $carousel.data('flickity-related-products');
            const flkty = new Flickity($carousel[0], options);
          }
        }, 100);
      }
    },

    async _initCartUpsells() {
      if (!app.storeUtilities.cartUpsells.settings.enabled) {
        return;
      }

      // TO DO
      // Eliminate the need of making request to the proxy every time the cart is updated.
      // Maybe pass once the data and work with what you have after this.

      const cartUpsells = await axios.get('/apps/store-utilities-proxy/getCartUpsells');
      app.storeUtilities.cartUpsells.products = [];

      // get all primary upsell products (primary products => they appear in any cart)
      const primaryUpsells = cartUpsells.data.filter((x) => {
        return x.isPrimary === true && x.enabled === true;
      });

      primaryUpsells.forEach((item) => {
        app.storeUtilities.cartUpsells.products.push(item.data);
      });

      // get all secondary upsell products (not primary products => they have other assigned products)
      const secondaryUpsells = cartUpsells.data.filter((x) => {
        return x.isPrimary === false && x.enabled === true;
      });

      secondaryUpsells.forEach((upsellItem) => {
        app.cart.items.forEach((cartItem) => {
          if (upsellItem.productId === cartItem.product_id.toString()) {
            app.storeUtilities.cartUpsells.products.push(...upsellItem.products);
          }
        });
      });

      // remove duplicates
      app.storeUtilities.cartUpsells.products = app._removeDuplicates(app.storeUtilities.cartUpsells.products);

      // remove the products that are already in the cart
      app.cart.items.forEach((cartItem) => {
        const index = app.storeUtilities.cartUpsells.products.findIndex((x) => x.id === cartItem.product_id);

        if (index > -1) {
          app.storeUtilities.cartUpsells.products.splice(index, 1);
        }
      });

      app._initUpsellCarousel();
    },

    _openModalCartUpsell(recentItem) {
      if (app.currentTemplate === 'cart') {
        return;
      }

      if (!app.recentCartItem) {
        app.recentCartItem = recentItem;
      }

      const $cartModal = $('[data-modal-cart]');
      $cartModal.modal('show');

      $cartModal.on('shown.bs.modal', (e) => {
        app._initUpsellCarousel();
      });

      $cartModal.on('hidden.bs.modal', (e) => {
        app.recentCartItem = null;
      });
    },

    _initUpsellCarousel() {
      if (app.storeUtilities.cartUpsells.settings.displayStyle !== 'carousel') {
        return;
      }

      let $carousel;
      let carouselOptions;
      let flkty;

      setTimeout(() => {
        $carousel = $('[data-flickity-cart-upsells]');
        carouselOptions = $carousel.data('flickity-cart-upsells');

        if (app.currentTemplate === 'cart') {
          $carousel.hide();
          flkty = new Flickity($carousel[0]);
        }

        if ($carousel.length > 0) {
          if (app.currentTemplate === 'cart') {
            flkty.destroy();
          }

          flkty = new Flickity($carousel[0], carouselOptions);

          if (app.currentTemplate === 'cart') {
            $carousel.show();
          }

          flkty.resize();
        }
      }, 100);
    },

    async _initCartPromos() {
      if (!app.storeUtilities.cartPromos.settings.enabled) {
        return;
      }

      // let promosCartTotalValue = 0;
      const cartPromoProducts = await axios.get('/apps/store-utilities-proxy/getCartPromos');
      cartPromoProducts.data.sort((a, b) => (a.order - b.order));
      app.storeUtilities.cartPromos.products = cartPromoProducts.data;

      // get all promos in cart
      const promosInCart = app.cart.items.filter((x) => x.properties.promo_product === 'true');
      // set new totals
      const promosCartTotalValue = promosInCart.reduce((a, b) => +Number(a) + +Number(b.price), 0);
      app.storeUtilities.cartPromos.inCartTotalValue = promosCartTotalValue;
      app.cart.subtotal_price = app.cart.total_price;
      app.cart.total_price -= promosCartTotalValue; // set new total after subtracting the total addons value

      app.storeUtilities.cartPromos.products.forEach((product) => {
        app._checkPromoQualification(product);
      });

      app._checkCartForOrphanedPromos();
    },

    async _submitLoginHelperForm() {
      const formEl = $('#customer_login')[0];
      const formData = new FormData(formEl);
      const customerEmail = formData.get('customer[email]');
      const customerPassword = formData.get('customer[password]');
      app.$sessionStorage.set('customer_temp_email', customerEmail);

      if (!customerEmail) {
        $('#customerEmail').addClass('is-invalid');
        return;
      }

      $('#customerEmail').removeClass('is-invalid');

      app.isLoading = true;
      const customerData = await axios.get(`/apps/store-utilities-proxy/getCustomerData?customer_email=${customerEmail}`);
      app.isLoading = false;
      app.storeUtilities.loginHelper.status = customerData.data.status;
      app.storeUtilities.loginHelper.message = customerData.data.message;
      // console.log(customerData.data.status);

      if (customerPassword) {
        formEl.submit();
      } else {
        $('#customerPassword').addClass('is-invalid');
      }
    },

    /**
     * Add product add-on
     */
    _addProductAddon(variantId, event) {
      const product = app.storeUtilities.productAddons.products.find((x) => x.variants[0].id === variantId);
      app.storeUtilities.productAddons.totalValue += parseFloat(product.variants[0].price) * 100;
      product.selected = true;
    },

    /**
     * Remove product add-on
     */
    _removeProductAddon(variantId, event) {
      const product = app.storeUtilities.productAddons.products.find((x) => x.variants[0].id === variantId);
      app.storeUtilities.productAddons.totalValue -= parseFloat(product.variants[0].price) * 100;
      product.selected = false;
    },

    /**
     * Promo products URL enabled codes
     */
    _setPromosEnablerCodes() {
      const storedEnablerCodes = JSON.parse(sessionStorage.getItem('cart_promos_enabler_codes')) || [];
      const newUserCode = app._getUrlParameter('promo_code');
      const storedUserCode = storedEnablerCodes.find((code) => code === newUserCode);

      // push the user code from the url to the array in the session only if it doesn't exists
      if (newUserCode && !storedUserCode) {
        storedEnablerCodes.push(newUserCode);
        sessionStorage.setItem('cart_promos_enabler_codes', JSON.stringify(storedEnablerCodes));
      }
      // set the final codes
      app.storeUtilities.cartPromos.enablerCodes = storedEnablerCodes;
    },

    _getUpsellMessage(upsellMessage, qualifierAmount) {
      const cartTotal = parseFloat(app.cart.total_price / 100);
      const remainingAmount = Math.abs((cartTotal - parseFloat(qualifierAmount)) * 100);
      const remainingAmountMoney = app._formatMoney(remainingAmount);

      if (upsellMessage.indexOf('{amount}') >= 0) {
        upsellMessage = upsellMessage.split('{amount}');
        upsellMessage = `${upsellMessage[0]} ${remainingAmountMoney} ${upsellMessage[1]}`;
      }

      return upsellMessage;
    },

    /**
     * Check if cart promo product is qualified for the cart
     */
    _checkPromoQualification(product) {
      const cartItems = app.cart.items;
      const discountCode = app.storeUtilities.cartPromos.settings.discountCode;
      const qualifierType = product.settings.qualifierType;
      const qualifierAmount = product.settings.minimumCartAmount * 100;
      const isPromoInCart = cartItems.findIndex((x) => x.product_id === product.data.id); // search if promo exists in cart items

      if (isPromoInCart >= 0) { // promo exists in cart => make the following checks
        product.inCart = true;
        // we need this to pass the discount code at the checkout URL
        // alters the cart form URL on the fly
        const currentFormAction = $(app.selectors.cartForm).attr('action');
        let delimiter = '?';

        if (currentFormAction && currentFormAction.indexOf('?') !== -1) {
          delimiter = '&';
        }

        $(app.selectors.cartForm).attr('action', `${currentFormAction}${delimiter}discount=${discountCode}`);
      } else {
        product.inCart = false;
      }

      // check qualification rules
      if (qualifierType === 'minimum cart amount') {
        product.visible = false;

        if (app.cart.total_price >= qualifierAmount) { // qualifier rules are valid
          product.qualified = true;
          app._checkPromoEnablerCode(product);
        } else { // qualifier rules are invalid
          product.qualified = false;

          if (product.settings.enableUpsell) {
            app._checkPromoEnablerCode(product);
          } else {
            product.visible = false;
          }

          // qualifier rules no longer valid for a promo => remove it from cart
          if (isPromoInCart >= 0) {
            app._removePromoFromCart(product.data.id);
          }
        }
      } else {
        product.qualified = true;
        app._checkPromoEnablerCode(product);
      }
    },

    _checkPromoEnablerCode(product) {
      const productId = product.data.id;
      const variantId = product.data.variants[0].id;
      const addMode = product.settings.addMode;
      const cartItems = app.cart.items;
      const promoUrlEnablerCode = product.settings.urlEnablerCode;
      const matchedPromoCode = app.storeUtilities.cartPromos.enablerCodes.find((code) => code === promoUrlEnablerCode);

      // enable with URL code (param) logic
      if (promoUrlEnablerCode) {
        product.visible = false;

        if (matchedPromoCode) {
          if (product.settings.addMode === 'auto' && product.qualified && cartItems.length > 0) {
            app._addPromoToCart(productId, variantId, addMode);
          } else {
            product.visible = true;
          }
        }
      } else if (product.settings.addMode === 'auto' && product.qualified && cartItems.length > 0) {
        app._addPromoToCart(productId, variantId, addMode);
      } else {
        product.visible = true;
      }
    },

    _checkCartForOrphanedPromos() {
      // get all promos in cart
      const promosInCart = app.cart.items.filter((x) => x.properties.promo_product === 'true');

      // If all cart items are only promo products then we have orphaned promo products in the cart
      // We need to remove these from the cart => No cheating ;-)
      if (app.cart.item_count > 0 && app.cart.item_count === promosInCart.length) {
        // empty the cart!
        app._clearPromosFromCart();
      }
    },

    _addPromoToCart(productId, variantId, addMode) {
      if (app.currentTemplate !== 'cart') {
        return;
      }

      const product = app.cart.items.find((item) => item.product_id === productId);

      // add promo product to cart only if it's not already there
      if (!product) {
        app.isLoading = true;

        axios.post('/cart/add.js', {
          quantity: 1,
          id: variantId,
          properties: {
            promo_product: 'true',
            add_mode: addMode,
          },
        })
          .then((response) => {
            app.isLoading = false;

            if (!app.isCartAjaxed) {
              location.reload();
            } else {
              app._getCartData();
              app.$snotify.success('Gift added to cart. A discount estimate has been applied.', 'Free Gift', {
                timeout: 10000,
                showProgressBar: true,
                closeOnClick: true,
                pauseOnHover: true,
                buttons: [{
                  text: 'Close',
                  bold: true,
                  closeOnClick: true,
                }],
              });
            }
            return response;
          })
          .catch((error) => {
            console.log(error);
            throw error;
          });
      }
    },

    _removePromoFromCart(productId) {
      if (app.currentTemplate !== 'cart') {
        return;
      }

      const cartItemIndex = app.cart.items.findIndex((item) => item.product_id === productId) + 1;
      app.isLoading = true;

      axios.post('/cart/change.js', {
        quantity: 0,
        line: cartItemIndex,
      })
        .then((response) => {
          app.isLoading = false;

          if (!app.isCartAjaxed) {
            location.reload();
          } else {
            app._getCartData();
            app.$snotify.info('Gift removed from cart.', 'Free Gift', {
              timeout: 10000,
              showProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              buttons: [{
                text: 'Close',
                bold: true,
                closeOnClick: true,
              }],
            });
          }
          return response;
        })
        .catch((error) => {
          console.log(error);
          throw error;
        });
    },

    _clearPromosFromCart(itemCount) {
      app.isLoading = true;
      let title;
      let body;

      if (app.cart.item_count > 1) {
        title = 'Free Gifts';
        body = 'Gifts removed from cart.';
      } else {
        title = 'Free Gift';
        body = 'Gift removed from cart.';
      }

      axios.post('/cart/clear.js')
        .then((response) => {
          app.isLoading = false;

          if (!app.isCartAjaxed && app.currentTemplate === 'cart') {
            location.reload();
          } else {
            app._getCartData();

            if (app.currentTemplate !== 'cart') {
              app._toggleCartDrawer();
            }

            app.$snotify.info(body, title, {
              timeout: 10000,
              showProgressBar: true,
              closeOnClick: true,
              pauseOnHover: true,
              buttons: [{
                text: 'Close',
                bold: true,
                closeOnClick: true,
              }],
            });
          }
          return response;
        })
        .catch((error) => {
          console.log(error);
          throw error;
        });
    },

  },
};

export default storeUtilitiesMethods;
