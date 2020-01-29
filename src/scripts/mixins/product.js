/**
 * Product methods
 * -----------------------------------------------------------------------------
 *
 * @namespace product
 */

import axios from 'axios';
import Flickity from 'flickity';
import 'flickity-as-nav-for';
import 'flickity-fullscreen';
import zoomio from 'zoomio';
import enquire from 'enquire.js';
// import detectIt from 'detect-it';
import scrollMonitor from 'scrollmonitor';

const productMethods = {

  data() {
    return {
      enableHistoryState: false,
      isProductToolbarMobileOpen: false,
      product: {},
      currentVariant: {},
    };
  },

  methods: {

    /**
     * Product Single
     */
    _initProduct() {
      const $container = $('[data-template="product"]');
      const $productTabs = $(app.selectors.productTabs);
      const $productToolbarMobile = $(app.selectors.productToolbarMobile);
      const $imageZoom = $(app.selectors.imageZoom);
      const productObj = app.selectors.productObj;

      // product tabs add active class to 1st child
      $productTabs.find('.nav-item').first().find('a')
        .addClass('active');
      $productTabs.find('.tab-content .tab-pane').first().addClass('active');

      // stop parsing if we are not in the product template
      if (app.currentTemplate !== 'product') {
        return;
      }

      // set data
      app.product = JSON.parse($(productObj).html());
      const productData = JSON.parse($(productObj).html());
      app.product = productData.product;
      app.product.options_with_values = productData.options_with_values;

      // assign the product cart limit
      app.product.tags.forEach((tag) => {
        if (tag.match('cart-limit')) {
          const cartLimit = tag.replace('cart-limit-', '');
          app.product.cart_limit = parseFloat(cartLimit);
          // console.log(app.product);
        }
      });

      app.enableHistoryState = $container.data('enable-history-state');
      app._getVariant();

      // Recharge widget
      app._attachRechargeWidget(app.product.id);

      function registerMobileToolbar() {
        const productFormPosition = $(app.selectors.productForm).position();
        const formWatcher = scrollMonitor.create($(app.selectors.productForm));
        const footerWatcher = scrollMonitor.create($('[data-footer-bottom]'));
        $productToolbarMobile.show();

        window.addEventListener('scroll', () => {
          const windowScrollY = window.scrollY;

          if (windowScrollY > productFormPosition.top) {
            formWatcher.exitViewport(() => {
              // console.log( 'I have left the viewport' )
              $productToolbarMobile.addClass('semi-opened');
            });

            formWatcher.enterViewport(() => {
              // console.log( 'I have entered the viewport' )
              $productToolbarMobile.removeClass('semi-opened fully-opened');
              if (app.isProductToolbarMobileOpen) {
                app.isProductToolbarMobileOpen = false;
              }
            });

            footerWatcher.exitViewport(() => {
              $productToolbarMobile.addClass('semi-opened');
            });

            footerWatcher.enterViewport(() => {
              $productToolbarMobile.removeClass('semi-opened fully-opened');
              if (app.isProductToolbarMobileOpen) {
                app.isProductToolbarMobileOpen = false;
              }
            });
          } else {
            $productToolbarMobile.removeClass('semi-opened fully-opened');
            if (app.isProductToolbarMobileOpen) {
              app.isProductToolbarMobileOpen = false;
            }
          }
        }); // add scroll event listener
      }

      // mobile product form - sticky toolbar
      enquire.register('screen and (min-width: 720px)', {
        setup() {
          registerMobileToolbar();
        },
        match() {
          $productToolbarMobile.hide();

          $imageZoom.zoomio({
            fadeduration: 200,
          });
        },
        unmatch() {
          registerMobileToolbar();
        },
      });
    },

    /**
     * Event when product option select or input changes
     *
     */
    _getVariant(event) {
      const variant = app._getVariantFromOptions(event);
      // console.log(variant);

      // stop parsing if there is no variant info
      if (!variant) {
        app.currentVariant = {};
        return;
      }

      app._updateImages(variant, event);
      app._checkWishlist(variant);

      if (app.isQuickshopModalOpen) {
        app.quickShop.currentVariant = variant;

        // ReCharge Integration for the quick shop
        // Update data needed for ReCharge when variant changes
        // get current variant metafields for subscriptions
        axios.get(`/products/${app.quickShop.product.handle}?variant=${variant.id}&view=variant-metafields-subscriptions.json`)
          .then((response) => {
            if (response.data.discount_variant_id) {
              const rechargeFunction = `reChargeJS_${app.quickShop.product.id}`;
              // assign
              app.quickShop.metafields.subscriptions = response.data;
              app.reChargeDiscountVariantId = response.data.discount_variant_id;
              // Initialize Recharge widget script (currently opened product)
              window[rechargeFunction]($);
              // console.log(app.reChargeDiscountVariantId);

            }
            return response;
          })
          .catch((error) => {
            console.log(error);
            throw error;
          });

      } else if (app.currentTemplate === 'collection') { // collection
        const productId = $(event.currentTarget).closest(app.selectors.productForm).data('product-id');
        const product = app.collection.products.find((x) => x.id === productId);
        product.current_variant = variant;

      } else if (app.currentTemplate === 'product') {
        app.currentVariant = variant;
        if (app.enableHistoryState) {
          app._updateHistoryState(variant);
        }

        // ReCharge Integration for the product page
        // Update data needed for ReCharge when variant changes
        const discountVariantId = $(`[data-variant-id="${variant.id}"]`).attr('data-discount-variant-id');
        app.reChargeDiscountVariantId = discountVariantId;
      }
    },

    /**
     * Get the currently selected options from add-to-cart form.
     *
     * @return {array} options - Values of currently selected variants
     */
    _getCurrentOptions(event) {
      const singleOptionSelector = app.selectors.singleOptionSelector;
      const currentOptions = [];
      let $container;

      if (app.isQuickshopModalOpen) {
        $container = $('[data-template="quickshop"]').find(app.selectors.productForm);
      } else {
        $container = event ? $(event.currentTarget).closest(app.selectors.productForm) : $(app.selectors.productForm);
      }

      $.map($(singleOptionSelector, $container), (element) => {
        const $element = $(element);
        const type = $element.attr('type');
        const currentOption = {};

        if (type === 'radio' || type === 'checkbox') {
          if ($element[0].checked) {
            currentOption.value = $element.val();
            currentOption.index = $element.data('index');
            currentOptions.push(currentOption);
          }
        } else {
          currentOption.value = $element.val();
          currentOption.index = $element.data('index');
          currentOptions.push(currentOption);
        }
      });

      return currentOptions;
    },

    /**
     * Find variant based on selected values.
     *
     * @param  {array} selectedValues - Values of variant inputs
     * @return {object || undefined} found - Variant object from product.variants
     */
    _getVariantFromOptions(event) {
      const selectedValues = app._getCurrentOptions(event);
      let variants;
      let found = false;

      if (app.isQuickshopModalOpen) { // quickshop
        variants = app.quickShop.product.variants;
      } else if (app.currentTemplate === 'collection') { // collection
        const productId = $(event.currentTarget).closest(app.selectors.productForm).data('product-id');
        const product = app.collection.products.find((x) => x.id === productId);
        variants = product.variants;
      } else if (app.currentTemplate === 'product') { // product
        variants = app.product.variants;
      }

      variants.forEach((variant) => {
        let satisfied = true;

        selectedValues.forEach((option) => {
          if (satisfied) {
            satisfied = (option.value === variant[option.index]);
          }
        });

        if (satisfied) {
          found = variant;
        }
      });

      return found || null;
    },

    /**
     * Update history state for product deeplinking
     *
     * @param  {variant} variant - Currently selected variant
     * @return {k}         [description]
     */
    _updateHistoryState(variant) {
      if (!history.replaceState || !variant) {
        return;
      }

      let newUrl;

      const showReviewForm = app._getUrlParameter('showReviewForm');

      if (showReviewForm === '') {
        newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?variant=${variant.id}`;
      } else {
        newUrl = `${window.location.protocol}//${window.location.host}${window.location.pathname}?variant=${variant.id}&showReviewForm=${showReviewForm}`;
      }

      window.history.replaceState({
        path: newUrl,
      }, '', newUrl);
    },

    /**
     * Find variant image and scroll to this image
     * works for all product page templates
     * can be extended to update all images upon variant selection
     *
     * @param  {variant} variant - Currently selected variant
     */
    _updateImages(variant, event) {
      const variantImage = variant.featured_image || {};
      const variantTitle = variant.title;
      const templateType = $('[data-product-template]').data('product-template');
      const $scrollTarget = $(`[data-variant-title="${variantTitle}"]`);
      let $container;
      let currentVariantImage;

      if (app.isQuickshopModalOpen) {
        $container = $('[data-template="quickshop"]');
        currentVariantImage = app.quickShop.currentVariant.featured_image || {};
      } else if (app.currentTemplate === 'collection') {
        $container = $(event.currentTarget).closest(app.selectors.productForm);
        const productId = $container.data('product-id');
        const product = app.collection.products.find((x) => x.id === productId);
        if (product.current_variant.featured_image) {
          currentVariantImage = product.current_variant.featured_image.src || {};
        } else {
          currentVariantImage = product.featured_image || {};
        }
      } else if (app.currentTemplate === 'product') {
        $container = $('[data-template="product"]');
        currentVariantImage = app.currentVariant.featured_image || {};
      }

      const $carousel = $container.find('[data-carousel-main]');

      if (variantImage.src === currentVariantImage.src) {
        return;
      }

      enquire.register('screen and (min-width: 720px)', {
        match() {
          // For the 'minimal' product template
          // Scroll to variant image unless it's the first photo on load
          if (templateType === 'minimal' && !app.isQuickshopModalOpen && $scrollTarget[0]) {
            $('html, body').animate({
              scrollTop: $scrollTarget.offset().top,
            }, 350);
          }
        },
      });

      if ($carousel.length > 0) {
        const flkty = Flickity.data($carousel[0]);

        if (typeof flkty === 'undefined') {
          return;
        }

        const cellElements = flkty.getCellElements();
        cellElements.forEach((element, index) => {
          const imgAlt = $(element).data('variant-title');
          if (variantTitle.indexOf(imgAlt) !== -1) {
            flkty.selectCell(index, true, false); // value, isWrapped, isInstant
          }
        });
      }
    },

    /**
     * Mobile toolbar - product form - options
     */
    _toggleProductToolbarMobile() {
      const $productToolbarMobile = $(app.selectors.productToolbarMobile);
      app.isProductToolbarMobileOpen = !app.isProductToolbarMobileOpen;
      $productToolbarMobile.toggleClass('fully-opened');
    },

  },
};

export default productMethods;
