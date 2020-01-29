/**
 * Wishlist methods
 * -----------------------------------------------------------------------------
 *
 * @namespace wishlist
 */

import axios from 'axios';

const wishlistMethods = {

  data() {
    return {
      wishlist: [],
    };
  },

  methods: {
    _initWishlist() {
      app._getWishlist();
    },

    /**
     * Gets the wishlist Array from Local localStorage
     */
    _getWishlist() {
      const wishlist = localStorage.getItem('user_wishlist');
      if (!wishlist) {
        return;
      }

      // set data
      app.wishlist = JSON.parse(wishlist);
    },

    /**
     * Checks if a variant exists in the wishlist
     * @param  {variant}
     * @return {boolean}
     */
    _checkWishlist(variant) {
      const index = this.wishlist.findIndex((x) => x.id === variant);

      if (index === -1) {
        return false;
      }
      return true;
    },

    /**
     * Adds the selected variant in wishlist Array
     * @param  {productHandle, variantId}
     *
     */
    _addVariantToWishlist(productHandle, variantId, event) {
      const defaultVariantId = $(event.currentTarget).data('default-variant-id');
      variantId = variantId || defaultVariantId;
      const index = app.wishlist.findIndex((x) => x.id === variantId);

      // push object to wishlist Array only if it doesn't exists
      if (index === -1) {
        app.isLoading = true;

        axios.get(`/products/${productHandle}.js`)
          .then((response) => {
            app.isLoading = false;

            const currentVariant = response.data.variants.filter((x) => x.id === variantId)[0];

            // add additional properties to the object
            currentVariant.product_handle = productHandle;

            // default image
            if (currentVariant.option1 === 'Default Title' || currentVariant.featured_image === null) {
              currentVariant.featured_image = response.data.featured_image;
            }

            app.wishlist.push(currentVariant);
            localStorage.setItem('user_wishlist', JSON.stringify(app.wishlist));
            $('[data-toggle="tooltip"]').tooltip('hide');
            return response;
          })
          .catch((error) => {
            // console.log(error);
            throw error;
          });
      }
    },


    /**
     * Adds a variant from wishlist Array
     * @param  {variantId}
     *
     */
    _removeFromWishlist(variantId) {
      const index = app.wishlist.findIndex((x) => x.id === variantId);

      if (index > -1) {
        app.wishlist.splice(index, 1);
        localStorage.setItem('user_wishlist', JSON.stringify(app.wishlist));
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

export default wishlistMethods;
