/**
 * Shared state data
 * -----------------------------------------------------------------------------
 *
 * @namespace store
 */

const store = {
  // Elements via data attributes
  selectors: {
    sitePreloader: '[data-site-preloader]',
    productObj: '[data-product-json]',
    siteOverlay: '[data-site-overlay]',
    siteHeader: '[data-site-header]',
    headerSlider: '[data-header-slider]',
    searchLayer: '[data-search-layer]',
    newsletterPopup: '[data-newsletter-popup]',
    carousel: '[data-flickity]',
    productToolbarMobile: '[data-product-toolbar-mobile]',
    productTabs: '[data-product-tabs]',
    accountTabs: '[data-account-tabs]',
    singleOptionSelector: '[data-single-option-selector]',
    qtyContainer: '[data-qty-container]',
    qtyInput: '[data-qty-input]',
    cartItem: '[data-cart-item]',
    productForm: '[data-product-form]',
    cartForm: '[data-cart-form]',
    loginForm: '[data-login-form]',
    recoverForm: '[data-recover-form]',
    passwordInput: '[data-password-input]',
    imageZoom: '[data-img-zoom]',
  },

  // Global objects
  currentTemplate: null,
  isLoading: false,
  moneyFormat: window.theme.moneyFormat,
  colorSwatchesEnabled: window.theme.colorSwatchesEnabled,
  sizeSwatchesEnabled: window.theme.sizeSwatchesEnabled,
  productExcludeTag: window.theme.productExcludeTag,

  // ReCharge Integration
  reChargeDiscountVariantId: null,
};

export default store;
