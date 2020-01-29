// Older browsers support
import 'babel-polyfill';
import 'es6-promise/auto';
import 'formdata-polyfill';
import 'url-polyfill';

// Theme SCSS files
import '../../styles/theme.scss';
import '../../styles/theme.scss.liquid';

// Vue.js core
import Vue from 'vue';

// Bootstrap Framework
import 'bootstrap';

// Bootstrap-Vue
// import BootstrapVue from 'bootstrap-vue' // imports all library
// for better performance you can import individual components
import bPopover from 'bootstrap-vue/es/components/popover/popover';

// Local Storage
import Storage from 'vue-web-storage';

// Spinners
// https://epic-spinners.epicmax.co/#/get-started
import 'epic-spinners/dist/lib/epic-spinners.min.css';
import {HollowDotsSpinner} from 'epic-spinners/dist/lib/epic-spinners.min.js';

// Other libraries
import Vue2TouchEvents from 'vue2-touch-events';
import Snotify from 'vue-snotify';
import VueMatchHeights from 'vue-match-heights';
import VueInstagram from 'vue-instagram';

// allow inline javascript code to be executed by using '<script2></script2>' tag
import VueScript2 from 'vue-script2';

// Lazysizes plugin for lazyloading
import 'lazysizes';
import 'lazysizes/plugins/unveilhooks/ls.unveilhooks'; // bg images support extension
import 'lazysizes/plugins/bgset/ls.bgset'; // responsive bg images support extension
import 'lazysizes/plugins/parent-fit/ls.parent-fit'; // parent fit extension

// Store => common data objects
import store from '../store/store';

// mixins
import helperMethods from '../mixins/helpers';
import layoutMethods from '../mixins/layout';
import cartMethods from '../mixins/cart';
import collectionMethods from '../mixins/collection';
import productMethods from '../mixins/product';
import accountMethods from '../mixins/account';
import quickShopMethods from '../mixins/quickShop';
import wishlistMethods from '../mixins/wishlist';
import recentlyViewedMethods from '../mixins/recentlyViewed';
import productReviewsMethods from '../mixins/productReviews';
import sectionMethods from '../mixins/section';
import storeUtilitiesMethods from '../mixins/storeUtilities';
import customMethods from '../mixins/custom';

let app;

// register components in Vue
Vue.use(VueScript2);
// Vue.use(BootstrapVue);
Vue.use(Vue2TouchEvents);
Vue.use(VueMatchHeights);
Vue.use(VueInstagram);

Vue.use(Snotify, {
  global: {
    preventDuplicates: true,
  },
  toast: {
    position: 'rightTop',
  },
});

Vue.use(Storage, {
  drivers: ['session', 'local'], // default 'local'
});

// Create new Vue instance
new Vue({
  el: '#app',
  delimiters: ['${', '}'],

  components: {
    bPopover,
    HollowDotsSpinner,
  },

  mixins: [
    helperMethods,
    layoutMethods,
    cartMethods,
    collectionMethods,
    productMethods,
    accountMethods,
    quickShopMethods,
    wishlistMethods,
    recentlyViewedMethods,
    productReviewsMethods,
    sectionMethods,
    storeUtilitiesMethods,
    customMethods,
  ],

  data() {
    return store; // shared data
  },

  beforeCreate() {
    $('.shopify-challenge__container').detach().appendTo('[data-app-scripts]');
    $('#additional-checkout-buttons iframe').addClass('d-none').detach()
    .appendTo('[data-app-scripts]');
    //$('#app script').detach().appendTo('[data-app-scripts]');
  },

  mounted() {
    app = this;
    window.app = app;
    window.slate = window.slate || {};
    window.theme = window.theme || {};
    $(window).on('load', app._initTheme);
  },

  methods: {
    _initTheme() {
      $('html').removeClass('wf-loading');
      // call helper function
      app._getCurrentTemplate();
      // initialization methods
      app._initLayout(); // various functions related to layout, e.g. initialize Bootstrap specific components etc
      app._initCart(); // everything cart related, e.g. add product to cart etc
      app._initCollection(); // everything related to the collection pages, e.g. collection filtering etc
      app._initProduct(); // everything related to the product page, e.g. variant selection, product options, galleries etc
      app._initAccount(); // everything related to the user account page, login, register etc
      app._initWishlist(); // wishlist functionality
      app._initRecentlyViewed(); // recently viewed products functionality
      app._initProductReviews(); // product reviews functionality
      app._initSection(); // Shopify admin sections & blocks => interaction between theme JavaScript and the theme editor
      app._initStoreUtilities(); // methods for the store utilities app
      app._initCustomMethods(); // custom JS code
    },
  },
});
