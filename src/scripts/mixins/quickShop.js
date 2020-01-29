/**
 * Quick Shop methods
 * -----------------------------------------------------------------------------
 *
 * @namespace quickShop
 */

import axios from 'axios';
import detectIt from 'detect-it';
import Flickity from 'flickity';
import 'flickity-bg-lazyload';

const quickShopMethods = {

  data() {
    return {
      quickShop: {
        isQuickshopModalOpen: false,
        currentVariant: {},
        product: {},
        images: {},
        optionImages: {},
        metafields: {},
      },
    };
  },

  methods: {
    /**
     * Adds a variant from wishlist Array
     * @param  {productHandle}
     *
     */
    async _viewQuickShop(productHandle, selectedOptions, event) {
      const $modal = $('[data-template="quickshop"]');
      const $modalBody = $modal.find('.modal-body');
      const $qtyEl = $modal.find(app.selectors.qtyInput);
      let $carousel;
      let carouselOptions;
      let flktyMain;
      let cellElements;
      let productId;
      app.isLoading = true;

      // console.log(productHandle);

      // get product main data
      await axios.get(`/products/${productHandle}.js`)
        .then((response) => {
          app.quickShop.product = response.data;
          productId = response.data.id;
          return response;
        })
        .catch((error) => {
          console.log(error);
          throw error;
        });

      // get product images info with alt tags
      await axios.get(`/products/${productHandle}?view=json`)
        .then((response) => {
          app.isLoading = false;
          app.quickShop.images = response.data.images;
          app.quickShop.optionImages = response.data.option_images;

          // assign the product cart limit
          app.quickShop.product.cart_limit = null;

          if (app.quickShop.product.tags) {
            app.quickShop.product.tags.forEach((tag) => {
              if (tag.match('cart-limit')) {
                const cartLimit = tag.replace('cart-limit-', '');
                app.quickShop.product.cart_limit = parseFloat(cartLimit);
              }
            });
          }

          $modal.on('shown.bs.modal', function(e) {
            app.isQuickshopModalOpen = true;
            $carousel = $(this).find('[data-flickity]');

            // re-init tooltips but only for desktop
            if (!detectIt.hasTouch) {
              $('[data-toggle="tooltip"]').tooltip();
            }

            if ($carousel.length > 0) {
              carouselOptions = $carousel.data('flickity');
              flktyMain = new Flickity($carousel[0], carouselOptions);
              cellElements = flktyMain.getCellElements();
              flktyMain.resize();
            }

            if (!selectedOptions) {
              selectedOptions = app.quickShop.product.variants[0].options;
            }

            selectedOptions.forEach((option) => {
              $(`[data-template="quickshop"] input[value="${option}"]`).trigger('click');
              $(`[data-template="quickshop"] option[value="${option}"]`).prop('selected', true);
            });

            setTimeout(() => {
              app._getVariant(event);
            }, 100);

            setTimeout(() => {
              // attach Recharge widget
              // if (app.quickShop.metafields.subscriptions) {
              //   app._attachRechargeWidget(productId);
              // }
              // open modal
              $modalBody.addClass('opened');
            }, 400);
          });

          $modal.on('hidden.bs.modal', (e) => {
            // resets
            $qtyEl.val(1); // reset qty input to 1
            app.quickShop.product = {};
            app.quickShop.images = {};
            app.quickShop.currentVariant = {};
            app.reChargeDiscountVariantId = null;
            app.isQuickshopModalOpen = false;
            $modalBody.removeClass('opened');

            // detach Recharge widget
            // if (app.quickShop.metafields.subscriptions) {
            //   app._detachRechargeWidget(productId);
            //   app.quickShop.metafields.subscriptions = {};
            // }

            // destroy carousel if exists
            if ($carousel.length > 0) {
              flktyMain.destroy();
            }
          });

          $modal.modal('show');
          return response;
        })
        .catch((error) => {
          // console.log(error);
          throw error;
        });
    },
  },
};

export default quickShopMethods;
