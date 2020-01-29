/**
 * Product reviews methods
 * -----------------------------------------------------------------------------
 *
 * @namespace productReviews
 */

import Flickity from 'flickity';
import axios from 'axios';
import Pagination from 'laravel-vue-pagination';
import StarRating from 'vue-star-rating';

// Import FilePond polyfill for IE11 support
import 'filepond-polyfill';

// Import Vue FilePond
import vueFilePond from 'vue-filepond';

// Import FilePond styles
import 'filepond/dist/filepond.min.css';

// Import FilePond plugins
// Please note that you need to install these plugins separately

// Import image preview plugin styles
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.min.css';

// Import image preview and file type validation plugins
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';

// Create component
const FilePond = vueFilePond(FilePondPluginFileValidateType, FilePondPluginImagePreview);

// global variables
let shopifyId;
const shopifyDomain = Shopify.shop;
const apiUrl = 'https://dev-reviews.hulkapps.com/api/shop';
const $reviewsApp = $('[data-product-reviews]');
const productId = $reviewsApp.data('product-id');
const productTitle = $reviewsApp.data('product-title');
const reviewsType = $reviewsApp.data('type');

const productReviewsMethods = {
  components: {
    Pagination,
    StarRating,
    FilePond,
  },

  data() {
    return {
      googleData: '',
      reviewSettings: {},
      productReviews: {
        data: {},
        pagination: {},
      },
      singleReview: {},
      modalReviewsData: {},
      totalReviews: 0,
      reviewsAvgRating: 0,
      rating: 5,
      userReviewImage: {
        name: null,
        data: null,
      },
    };
  },

  methods: {
    _initProductReviews() {
      if (!window.theme.productReviewsEnabled) {
        return;
      }

      app._getShopReviews();
      app._checkUrlParams();
    },

    _checkUrlParams() {
      // check for URL parameter in order to open the new review modal
      const showReviewForm = app._getUrlParameter('showReviewForm');

      if (showReviewForm === 'true') {
        setTimeout(() => {
          app._showReviewForm();
        }, 1500);
      }
    },

    _scrollToReviews() {
      let $target;

      if (reviewsType === 'productReviews') {
        $target = $('a[href="#reviews"]');
        $target.tab('show'); // make tab active
      } else {
        $target = $('header');
      }

      $('html, body').animate({
        scrollTop: $target.offset().top - 30,
      }, 'false');
    },

    _createReviewsLd() {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.innerHTML = JSON.stringify(app.googleData, null, 4);
      document.getElementsByTagName('body')[0].appendChild(script);
    },

    _createNewProductLd(obj) {
      // remove old script
      $('#productLd').remove();
      const script = document.createElement('script');
      script.id = 'productLd';
      script.type = 'application/ld+json';
      script.innerHTML = JSON.stringify(obj, null, 4);
      document.getElementsByTagName('body')[0].appendChild(script);
    },

    _initReviewsCarousel() {
      new Flickity('[data-reviews-carousel]', {
        adaptiveHeight: true,
        accessibility: true,
        autoPlay: 5000,
        cellAlign: 'center',
        dragThreshold: 20,
        groupCells: '100%',
        prevNextButtons: true,
        pageDots: true,
        setGallerySize: true,
        wrapAround: false,
        contain: true,
        arrowShape: {
          x0: 10, x1: 60, y1: 50, x2: 60, y2: 45, x3: 15,
        },
      });
    },

    _getShopReviews() {
      // first find the Shop Id by providing the shopify domain
      axios.get(`${apiUrl}?shopify_domain=${shopifyDomain}`)
        .then((response) => {
          shopifyId = response.data.data.shopify_id;
          // console.log(shopifyId);

          if (!shopifyId) {
            return;
          }

          if (app.currentTemplate === 'product') {
            app._getReviews();
          } else if (app.currentTemplate === 'collection') {
            app._getCollectionReviews();
          }
          return response;
        })
        .catch((error) => {
          // console.log(error);
          throw error;
        });
    },

    _getProductReviews() {
      return axios.get(`${apiUrl}/${shopifyId}/reviews?product_id=${productId}`);
    },

    _getSettings() {
      return axios.get(`${apiUrl}/${shopifyId}/settings`);
    },

    _pushStructuredObj(arr, review) {
      arr.push({
        '@context': 'http://schema.org/',
        '@type': 'Review',
        itemReviewed: {
          '@type': 'Product',
          name: productTitle,
        },
        author: {
          '@type': 'Person',
          name: review.author,
        },
        name: review.title,
        reviewBody: review.body,
        reviewRating: {
          '@type': 'Rating',
          ratingValue: review.rating,
          bestRating: '5',
        },
      });
    },

    _getReviews() {
      // app.isLoading = true

      // axios multiple requests
      axios.all([
        app._getProductReviews(),
        app._getSettings(),
      ])
        .then(axios.spread((productReviewsRes, settingsRes) => {
          // All requests are now complete
          const settings = settingsRes.data.data;
          const layoutMode = settings.layout_mode;
          const reviews = productReviewsRes.data;
          // set data
          app.reviewSettings = settings;
          app.productReviews.data = reviews.data;
          app.productReviews.pagination = reviews;
          app.totalReviews = reviews.total_reviews;
          app.reviewsAvgRating = reviews.avg_rating;

          app.$nextTick(() => {
            // app.isLoading = false
            $('[data-product-reviews]').fadeIn();

            if (app.productReviews && layoutMode === 'carousel') {
              app._initReviewsCarousel();
            }
          });
        }))
        .catch((error) => {
          // console.log(error);
          app.isLoading = false;
          throw error;
        });
    },

    _getRating(review) {
      const self = this;
      let rating = '';

      for (let i = 0; i < 5; i += 1) {
        if (review.rating > i) {
          rating += `<span class="icon-review ion-ios-${self.reviewSettings.rating_symbol}" style="color:${self.reviewSettings.rating_color}"></span>`;
        } else {
          rating += `<span class="icon-review ion-ios-${self.reviewSettings.rating_symbol}-outline" style="color:${self.reviewSettings.rating_color}"></span>`;
        }
      }
      return rating;
    },

    _getAvgRating() {
      const self = this;
      let rating = '';

      for (let i = 0; i < 5; i += 1) {
        if (self.reviewsAvgRating > i) {
          rating += `<span class="icon-review ion-ios-${self.reviewSettings.rating_symbol}" style="color:${self.reviewSettings.rating_color}"></span>`;
        } else {
          rating += `<span class="icon-review ion-ios-${self.reviewSettings.rating_symbol}-outline" style="color:${self.reviewSettings.rating_color}"></span>`;
        }
      }
      return rating;
    },

    _getPagedResults(page) {
      let reviewsUrl = '';
      app.isLoading = true;

      if (typeof page === 'undefined') {
        page = 1;
      }

      if (reviewsType === 'productReviews') {
        reviewsUrl = `/get_product_reviews/${shopifyId}/${productId}?page=${page}`;
      }

      if (reviewsType === 'allReviews') {
        reviewsUrl = `/get_all_reviews/${shopifyId}?page=${page}`;
      }

      axios.get(apiUrl + reviewsUrl)
        .then((response) => {
          if (reviewsType === 'productReviews') {
            app.productReviews.data = response.data.reviews.data;
            app.productReviews.pagination = response.data.reviews;
            delete app.productReviews.pagination.data;
          }

          if (reviewsType === 'allReviews') {
            app.allReviews.data = response.data.reviews.data;
            app.allReviews.pagination = response.data.reviews;
            delete app.allReviews.pagination.data;
          }

          app.isLoading = false;
          app._scrollToReviews();
          return response;
        })
        .catch((error) => {
          app.isLoading = false;
          throw error;
        });
    },

    _handleUserFileAdded() {
      // const userFile = this.$refs.userReviewImage.getFile()
      const imageData = JSON.parse($('input[name="userReviewImage"').val());
      app.userReviewImage.name = imageData.name;
      app.userReviewImage.data = imageData.data;
    },

    _resetForm() {
      app.rating = 5;
      if (app.reviewSettings.image_upload_enable) {
        this.$refs.userReviewImage.removeFiles();
        app.userReviewImage.name = null;
        app.userReviewImage.data = null;
      }
      $('#newReviewForm')[0].reset();
      $('#newReviewForm').find('input[type="submit"]').removeClass('disabled');
    },

    _showReviewForm() {
      app._resetForm();
      $('#response').empty();
      $('[data-modal-new-review]').modal('show');
    },

    _showReviewSingle(reviews, reviewId) {
      $('[data-modal-single-review]').modal('show');
      app.modalReviewsData = reviews;
      const review = reviews.find((item) => item.id === reviewId);

      app.singleReview = review;
      app._checkPagination(reviews, app.singleReview.id);
    },

    _getPrevReview(reviewId) {
      const reviews = app.modalReviewsData;
      const currentItemIndex = reviews.findIndex((item) => item.id === reviewId);

      if (currentItemIndex > 0) {
        app.singleReview = reviews[currentItemIndex - 1];
      }
      app._checkPagination(reviews, app.singleReview.id);
    },

    _getNextReview(reviewId) {
      const reviews = app.modalReviewsData;
      const currentItemIndex = reviews.findIndex((item) => item.id === reviewId);
      if (currentItemIndex < reviews.length - 1) {
        app.singleReview = reviews[currentItemIndex + 1];
      }
      app._checkPagination(reviews, app.singleReview.id);
    },

    _checkPagination(reviews, reviewId) {
      const currentItemIndex = reviews.findIndex((item) => item.id === reviewId);

      if (currentItemIndex === 0) {
        $('#prevLink').addClass('disabled');
      } else {
        $('#prevLink').removeClass('disabled');
      }
      if (currentItemIndex === reviews.length - 1) {
        $('#nextLink').addClass('disabled');
      } else {
        $('#nextLink').removeClass('disabled');
      }
    },

    _createReview() {
      let successHtml = '';
      let errorsHtml = '';
      const $newReviewForm = $('#newReviewForm');
      const settings = app.reviewSettings;

      const customFields = $("input[name='custom_field[]']").map(function() {
        return {
          label: $(this).attr('data-name'),
          value: $(this).val(),
        };
      }).get();

      const formData = {
        shopify_id: shopifyId,
        product_id: productId,
        product_handle: $newReviewForm.find('input[name=productHandle]').val(),
        product_title: $newReviewForm.find('input[name=productTitle]').val(),
        product_image: $newReviewForm.find('input[name=productImage]').val(),
        author: $newReviewForm.find('input[name=author]').val(),
        email: $newReviewForm.find('input[name=email]').val(),
        title: $newReviewForm.find('input[name=title]').val(),
        body: $newReviewForm.find('textarea[name=body]').val(),
        rating: app.rating,
        custom_fields: customFields,
        image_name: app.userReviewImage.name,
        image_data: app.userReviewImage.data,
      };

      console.log(JSON.stringify(formData));

      $newReviewForm.find('input[type="submit"]').addClass('disabled').val('Please Wait');

      axios.post(`${apiUrl}/${shopifyId}/reviews`, formData)
        .then((response) => {
          let message;

          if (settings.auto_publish_star && formData.rating >= settings.auto_publish_star) {
            message = 'Review has been successfully submitted. Thank you!';
            app.getReviews();
          } else {
            message = 'Review has been successfully submitted and awaiting for approval. Thank you!';
          }

          $('#newReviewForm').find('input[type="submit"]').val('Submit');
          successHtml = `<div class="alert alert-success">${message}</div>`;
          $('#response').html(successHtml);

          app._resetForm();

          setTimeout(() => {
            $('[data-modal-new-review]').modal('hide');
          }, 5000);

          return response;
        })
        .catch((error) => {
          $('#newReviewForm').find('input[type="submit"]').removeClass('disabled')
            .val('Submit');
          const errors = error.response.data.message;
          errorsHtml = '<div class="alert alert-warning"><ul>';
          $.each(errors, (key, value) => {
            errorsHtml += `<li>${value[0]}</li>`;
          });
          errorsHtml += '</ul></div>';
          $('#response').html(errorsHtml);
          throw error;
        });
    },

    // reviews for collection => product grid item
    _getCollectionReviews() {
      axios.get(`${apiUrl}/get_shop_reviews/${shopifyId}`)
        .then((response) => {
          app.allReviews = response.data.reviews;
          app.reviewSettings.rating_symbol = response.data.rating_symbol;
          app.reviewSettings.symbol_color = response.data.symbol_color;
          app._setProductCardReviews();
          return response;
        })
        .catch((error) => {
          // console.log(error);
          throw error;
        });
    },

    _setProductCardReviews() {
      $('[data-item-reviews]').each(function() {
        const productId = $(this).attr('data-product-id');
        const itemReviews = app.allReviews.filter((item) => item.product_id === productId);
        const totalReviews = itemReviews.length;
        let sum = 0;
        let avgRating = 0;
        let ratingHtml = '';
        let itemHtml = '';

        for (let i = 0; i < totalReviews; i += 1) {
          sum += itemReviews[i].rating;
        }

        if (totalReviews) {
          avgRating = Math.round(sum / totalReviews);
        }

        for (let i = 0; i < 5; i += 1) {
          if (avgRating > i) {
            ratingHtml += `<span class="icon-review ion-ios-${app.reviewSettings.rating_symbol}" style="color:${app.reviewSettings.symbol_color}"></span>`;
          } else {
            ratingHtml += `<span class="icon-review ion-ios-${app.reviewSettings.rating_symbol}-outline" style="color:${app.reviewSettings.symbol_color}"></span>`;
          }
        }

        if (totalReviews) {
          let text = '';
          if (totalReviews > 1) {
            text = 'reviews';
          } else {
            text = 'review';
          }
          itemHtml = `${ratingHtml}<span class="reviews-total d-block text-gray-700 small">${totalReviews} ${text}</span>`;
        }
        $(this).html(itemHtml);
        // dispatch event for the vue match heights directive/plugin
        document.dispatchEvent(new Event('matchheight'));
      });
    },
  },
};

export default productReviewsMethods;
