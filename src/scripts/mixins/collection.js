/**
 * Collection methods
 * -----------------------------------------------------------------------------
 *
 * @namespace collection
 */

import axios from 'axios';
import Flickity from 'flickity';
import detectIt from 'detect-it';

const createHistory = require('history').createBrowserHistory;

const history = createHistory();

const collectionMethods = {

  data() {
    return {
      isCollectionAjaxed: false,
      collection: {
        title: null,
        description: null,
        image: null,
        products: [],
        pagination: {},
        activeFilters: [],
      },
    };
  },

  methods: {
    _initCollection() {
      const isCollectionAjaxed = $('[data-template="collection"]').data('collection-ajaxed');

      // stop parsing if we are not in the collection template
      if (app.currentTemplate !== 'collection') {
        return;
      }

      // check collection section settings => enable ajax filters
      if (isCollectionAjaxed) {
        app.isCollectionAjaxed = true;
      } else {
        $(app.selectors.productObj).each((index, item) => {
          const productObj = $(item).html();
          const productData = JSON.parse(productObj);
          const product = productData.product;
          const optionsWithValues = productData.options_with_values;
          product.current_variant = product.variants[0];
          product.options_with_values = optionsWithValues;

          // assign the product cart limit
          product.tags.forEach((tag) => {
            if (tag.match('cart-limit')) {
              const cartLimit = tag.replace('cart-limit-', '');
              product.cart_limit = parseFloat(cartLimit);
              // console.log(product);
            }
          });

          app.collection.products.push(product);
        });
      }

      app._initFilters();
    },

    _showVariant(event) {
      const value = event.currentTarget.value;
      const $carousel = $(event.currentTarget).closest('.card').find('[data-flickity]');

      if ($carousel.length > 0) {
        const flkty = Flickity.data($carousel[0]);
        const cellElements = flkty.getCellElements();

        cellElements.forEach((element, index) => {
          const imgAlt = $(element).data('variant-title');
          if (imgAlt === value) {
            flkty.selectCell(index, true, false); // value, isWrapped, isInstant
          }
        });
      }
    },

    _initFilters() {
      // const location = history.location;
      Shopify.queryParams = {};

      // Listen for changes to the current location
      history.listen((location, action) => {
        // location is an object like window.location
        // console.log(action, location.pathname, location.state)
        app._runFilters(); // run every time history changes
      });

      // run one time during 1st page load or upon page refresh
      app._runFilters();
    },

    _runFilters() {
      app._urlParams();
      app._mapFilters();
      const url = app._filtersCreateUrl();

      if (app.isCollectionAjaxed) {
        app._getcollectionInfo();
        app._getCollFilteredProducts(url);
      }
    },

    /**
     * Event when an input filter changes
     *
     */
    _parseFilters(event) {
      const filterType = $(event.currentTarget).data('filter-type');
      const collectionHandle = $(event.currentTarget).data('handle');
      const selectedTags = [];

      // Collection filtering
      if (filterType === 'collection') {
        let newURL = '';
        let search = $.param(Shopify.queryParams);
        let href = $(event.currentTarget).attr('href');

        if (app.isCollectionAjaxed) {
          if (!search.length) {
            href += '?';
          }
          app._filterAjaxCall(href);
        } else {
          newURL = collectionHandle;
          if (selectedTags.length) {
            newURL += `/${selectedTags.join('+')}`;
          }
          delete Shopify.queryParams.page;
          search = $.param(Shopify.queryParams);
          if (search.length) {
            newURL += `?${search}`;
          }
          location.href = newURL;
        }
      }

      // Tag filter
      if (filterType === 'tag') {
        $('[data-filter]:checked').each(function(i) {
          selectedTags.push(this.value);
        });

        app.collection.activeFilters = selectedTags;

        if (selectedTags.length) {
          Shopify.queryParams.constraint = selectedTags.join('+');
        } else {
          delete Shopify.queryParams.constraint;
        }

        if (app.isCollectionAjaxed) {
          app._filterAjaxCall();
        } else {
          delete Shopify.queryParams.page;
          location.search = $.param(Shopify.queryParams).replace(/%2B/g, '+');
        }
      }

      // Sort filter
      if (filterType === 'sort') {
        const sortValue = $(event.currentTarget).val();

        if (sortValue) {
          Shopify.queryParams.sort_by = sortValue;
        } else {
          delete Shopify.queryParams.sort_by;
        }

        if (app.isCollectionAjaxed) {
          app._filterAjaxCall();
        } else {
          const search = $.param(Shopify.queryParams);
          if (search.length) {
            location.search = $.param(Shopify.queryParams);
          } else {
            location.href = location.pathname;
          }
        }
      }

      // Collection pagination
      if (filterType === 'pagination') {
        let url = $(event.currentTarget).attr('href').match(/page=\d+/g);
        Shopify.queryParams.page = parseInt(url[0].match(/\d+/g), 10);

        if (url && (Shopify.queryParams.page === parseInt(url[0].match(/\d+/g), 10), Shopify.queryParams.page)) {
          if (app.isCollectionAjaxed) {
            url = app._filtersCreateUrl();
            history.push(url, {
              param: Shopify.queryParams,
            });
            app._getNewTitle(Shopify.queryParams);
            app._getCollFilteredProducts(url);
          }
        }
      }

      // map all filters
      app._mapFilters();
    },

    /**
     * Get all parameters from URL and map them to all inputs in page
     *
     */
    _mapFilters() {
      // Read url parameters and map keys to filters
      if (location.search.length) {
        for (let aKeyValue, i = 0, aCouples = location.search.substr(1).split('&'); i < aCouples.length; i += 1) {
          aKeyValue = aCouples[i].split('=');
          if (aKeyValue.length > 1) {
            Shopify.queryParams[decodeURIComponent(aKeyValue[0])] = decodeURIComponent(aKeyValue[1]);
          }
        }
      }

      // sorting: select value
      if (Shopify.queryParams.sort_by) {
        $('[data-filter-sort]').val(Shopify.queryParams.sort_by);
      } else {
        $('data-filter-sort').val('manual');
      }

      // tags: select values
      if (Shopify.queryParams.constraint) {
        const selectedTags = [];
        $.each(Shopify.queryParams.constraint.split('+'), (i, val) => {
          if (val) {
            selectedTags.push(val);
          }
        });

        app.collection.activeFilters = selectedTags;
      }
    },

    _filtersCreateUrl(e) {
      const b = $.param(Shopify.queryParams).replace(/%2B/g, '+');
      return e ? b !== '' ? `${e}?${b}` : e : `${location.pathname}?${b}`;
    },

    _filterAjaxCall(e) {
      delete Shopify.queryParams.page;
      const url = app._filtersCreateUrl(e);
      history.push(url, {
        param: Shopify.queryParams,
      });
      app._getNewTitle(Shopify.queryParams);
      app._getCollFilteredProducts(url);
    },

    _urlParams() {
      if (Shopify.queryParams === {}, location.search.length) {
        for (let i, e = 0, t = location.search.substr(1).split('&'); e < t.length; e += 1) {
          i = t[e].split('='), i.length > 1 && (Shopify.queryParams[decodeURIComponent(i[0])] = decodeURIComponent(i[1]));
        }
      }
    },

    _getNewTitle(queryParams) {
      let tagParams = '';
      let pageParams = '';
      let finalParams = '';
      const title = document.title;
      const collection = title.slice(0, title.indexOf('-')).replace(/\s/g, '');
      const siteTitle = title.slice(title.lastIndexOf('-') + 1).replace(/\s/g, '');

      if (queryParams.constraint) {
        tagParams = ` - Tagged "${queryParams.constraint.replace(/\+/g, ', ')}"`;
      }

      if (queryParams.page) {
        pageParams = ` - Page ${queryParams.page}`;
      }

      finalParams = `${tagParams}${pageParams}`;
      const newTitle = `${collection}${finalParams} - ${siteTitle}`;
      document.title = newTitle;
    },

    _clearAllFilters() {
      delete Shopify.queryParams.constraint;
      delete Shopify.queryParams.q;
      app.collection.activeFilters = [];

      if (app.isCollectionAjaxed) {
        $('[data-filter]').attr('checked', false);
        app._filterAjaxCall();
      } else {
        location.search = $.param(Shopify.queryParams);
      }
    },

    _getCollFilteredProducts(url) {
      if (Shopify.designMode) {
        return;
      }

      const limit = $('[data-template="collection"]').data('pagination-limit');
      const search = $.param(Shopify.queryParams);
      app.collection.products = [];
      app.isLoading = true;

      url += (search.length) ? '&view=products.json' : 'view=products.json';

      // for Shopify theme editor
      if (Shopify.designMode) {
        url = `/admin/products.json?limit=${limit}`;
      }

      axios.get(url)
        .then((response) => {
          app.isLoading = false;
          const productsData = [];

          response.data.products.forEach((item) => {
            const product = item.product;

            // add default current_variant object
            product.current_variant = product.variants[0];

            // add product options
            product.options_with_values = item.options_with_values;

            // add cart limit tag
            product.tags.forEach((tag) => {
              if (tag.match('cart-limit')) {
                const cartLimit = tag.replace('cart-limit-', '');
                product.cart_limit = parseFloat(cartLimit);
              }
            });

            // exclude products that have the app.productExcludeTag (theme settings)
            if (product.tags.indexOf(app.productExcludeTag) === -1) {
              productsData.push(product);
            }
          });

          app.collection.products = productsData;
          app._getcollectionPagination(url);

          // reinitialize product reviews for each grid item
          app._getCollectionReviews();

          // reinitialize tooltips but only for desktop
          if (!detectIt.hasTouch) {
            setTimeout(() => {
              $('[data-toggle="tooltip"]').tooltip();
            }, 100);
          }

          $('html').animate({
            scrollTop: $('html').offset().top,
          }, 400);
          // unlock window - fix scrolltop common problem
          $(window).bind('mousewheel', () => {
            $('html').stop();
          });
          return response;
        })
        .catch((error) => {
          // console.log(error);
          throw error;
        });
    },

    _getcollectionInfo() {
      let url = window.location.href.replace(window.location.search, '');
      url += '?view=json';

      axios.get(url)
        .then((response) => {
          if (response.data) {
            app.collection.title = response.data.title;
            app.collection.description = response.data.body_html;
            app.collection.image = response.data.image;
          }
          return response;
        })
        .catch((error) => {
          // console.log(error);
          throw error;
        });
    },

    _getcollectionPagination(url) {
      url += '&view=paginate.json';

      axios.get(url)
        .then((response) => {
          app.collection.pagination = response.data;
          return response;
        })
        .catch((error) => {
          // console.log(error);
          throw error;
        });
    },

    _loadMore(event) {
      let url = $(event.currentTarget).attr('href');
      url = url.replace('paginate', 'products');
      app.isLoading = true;

      axios.get(url)
        .then((response) => {
          $.each(response.data, (key, item) => {
            item.current_variant = item.variants[0];

            // exclude products that have the app.productExcludeTag (theme settings)
            if (item.tags.indexOf(app.productExcludeTag) === -1) {
              app.collection.products.push(item);
            }
          });

          app.isLoading = false;
          app._getcollectionPagination(url);
          return response;
        })
        .catch((error) => {
          // console.log(error);
          throw error;
        });
    },

  },
};

export default collectionMethods;
