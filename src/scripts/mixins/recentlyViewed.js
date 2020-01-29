/**
 * Recently Viewed Products methods
 * -----------------------------------------------------------------------------
 *
 * @namespace recentlyViewed
 */

import Flickity from 'flickity';


const recentlyViewedMethods = {

  data() {
    return {
      recentlyViewed: [],
    };
  },

  methods: {
    _initRecentlyViewed() {
      const $container = $('[data-template="product"]');
      let productObj = app.selectors.productObj;
      let currentProductHandle;
      let currentVariantId;

      app._getRecentlyViewed();

      // product page
      if ($(productObj, $container).html()) {
        productObj = JSON.parse($(productObj, $container).html()).product;
        currentProductHandle = productObj.handle;
        currentVariantId = app.currentVariant.id;

        app._addVariantToRecentlyViewed(currentProductHandle, currentVariantId);

        // filter data
        // exclude the current visited product
        app.recentlyViewed = app.recentlyViewed.filter((item) => item.id !== currentVariantId);
      }
    },

    /**
     * Gets the recentlyViewed Array from localStorage
     */
    _getRecentlyViewed() {
      let recentlyViewed = localStorage.getItem('user_recently_viewed');
      if (!recentlyViewed) {
        return;
      }
      recentlyViewed = JSON.parse(recentlyViewed);

      // exclude products that have the app.productExcludeTag (theme settings)
      const index = recentlyViewed.findIndex((x) => x.tags.indexOf(app.productExcludeTag) > -1);
      if (index > -1) {
        recentlyViewed.splice(index, 1);
      }

      // reverse
      recentlyViewed.reverse();
      // set data
      app.recentlyViewed = recentlyViewed;

      // init recently viewed carousel
      setTimeout(() => {
        const $carousel = $('[data-flickity-recently-viewed]');

        if ($carousel.length > 0) {
          const options = $carousel.data('flickity-recently-viewed');
          const flkty = new Flickity($carousel[0], options);
          flkty.resize();
        }
      }, 100);
    },

    /**
     * Checks if a variant exists in the recentlyViewed Array
     * @param  {variant}
     * @return {boolean}
     */
    _checkRecentlyViewed(variantId) {
      const index = this.recentlyViewed.findIndex((x) => x.id === variantId);

      if (index === -1) {
        return false;
      }
      return true;
    },

    /**
     * Adds the selected variant in recentlyViewed Array
     * @param  {productHandle variantId}
     *
     */
    _addVariantToRecentlyViewed(productHandle, variantId) {
      const index = app.recentlyViewed.findIndex((x) => x.id === variantId);

      // push object to recentlyViewed Array only if it doesn't exists
      if (index === -1) {
        const currentVariant = app.currentVariant;

        // add additional properties to the object
        currentVariant.product_id = app.product.id;
        currentVariant.product_handle = productHandle;
        currentVariant.tags = app.product.tags;
        currentVariant.options_with_values = app.product.options_with_values;

        // default image
        if (currentVariant.option1 === 'Default Title' || app.currentVariant.featured_image === null) {
          currentVariant.featured_image = app.product.featured_image;
        } else {
          currentVariant.featured_image = app.currentVariant.featured_image.src;
        }

        app.recentlyViewed.push(currentVariant);
        localStorage.setItem('user_recently_viewed', JSON.stringify(app.recentlyViewed));
      }
    },

    /**
     * Adds a variant from recentlyViewed Array
     * @param  {variantId}
     *
     */
    _removeFromToRecentlyViewed(variantId) {
      const index = app.recentlyViewed.findIndex((x) => x.id === variantId);

      if (index > -1) {
        app.recentlyViewed.splice(index, 1);
        localStorage.setItem('user_recently_viewed', JSON.stringify(app.recentlyViewed));
      }
    },

    /**
     * Returns the variant Url from a given variant Id
     * @param  {productHandle, variantId}
     * @return {string}
     *
     */
    _getvariantUrl(productHandle, variantId) {
      return `/products/${productHandle}?variant=${variantId}`;
    },

  },
};

export default recentlyViewedMethods;
