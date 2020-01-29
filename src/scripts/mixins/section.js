/**
 * Section methods
 * Interaction between theme settings and the theme editor
 * -----------------------------------------------------------------------------
 *
 * @namespace section
 */

import Flickity from 'flickity';

const sectionMethods = {

  methods: {
    _initSection() {
      $(document)
        .on('shopify:section:load', app._onSectionLoad.bind(this))
        .on('shopify:section:unload', app._onSectionUnload.bind(this))
        .on('shopify:section:select', app._onSelect.bind(this))
        .on('shopify:section:deselect', app._onDeselect.bind(this))
        .on('shopify:block:select', app._onBlockSelect.bind(this))
        .on('shopify:block:deselect', app._onBlockDeselect.bind(this));
    },

    _onSectionLoad(e) {
      const sectionId = e.detail.sectionId;
    },

    _onSectionUnload(e) {
      const sectionId = e.detail.sectionId;
    },

    _onSelect(e) {
      const sectionId = e.detail.sectionId;
      const searchType = $(app.selectors.searchLayer).data('search-type');

      switch (sectionId) {
        case 'mobile-navigation': {
          $('.mobile-nav-drawer').addClass('opened');
          if (!app.isMobileNavDrawerOpen) {
            app._toggleMobileNavDrawer();
          }
          break;
        }
        case 'newsletter-popup': {
          $('.newsletter-popup').addClass('opened');
          if (!app.isNewsletterPopupOpen) {
            app._toggleNewsletterPopup();
          }
          break;
        }
        case 'search-layer': {
          if (searchType === 'full_screen') {
            app.isOverlayVisible = false;
            $('.search-full-screen').addClass('opened');
            $('header, footer, section').addClass('filter-blur').css('opacity', '0.5');
          } else {
            app.isOverlayVisible = true;
            $('.search-reveal').addClass('opened');
            $('header, footer, section').removeClass('filter-blur').css('opacity', '1');
          }
          if (!app.isSearchLayerOpen) {
            app._toggleSearch();
          }
          break;
        }
        default: {
          const $carousel = $(app.selectors.carousel);

          if ($carousel.length === 0) {
            return;
          }

          const options = $carousel.data('flickity');
          const flkty = new Flickity($carousel[0], options);
          setTimeout(() => {
            flkty.resize();
          }, 100);

          break;
        }
      }
    },

    _onDeselect(e) {
      const sectionId = e.detail.sectionId;

      switch (sectionId) {
        case 'mobile-navigation': {
          $('.mobile-nav-drawer').removeClass('opened');
          if (app.isMobileNavDrawerOpen) {
            app._toggleMobileNavDrawer();
          }
          break;
        }
        case 'newsletter-popup': {
          $('.newsletter-popup').removeClass('opened');
          if (app.isNewsletterPopupOpen) {
            app._toggleNewsletterPopup();
          }
          break;
        }
        case 'search-layer': {
          app.isOverlayVisible = false;
          $('header, footer, section').removeClass('filter-blur').css('opacity', '1');
          $('.search-full-screen, .search-reveal').removeClass('opened');
          if (app.isSearchLayerOpen) {
            app._toggleSearch();
          }
          break;
        }
        default: {
          break;
        }
      }
    },

    _onReorder(e) {
      const sectionId = e.detail.sectionId;
    },

    _onBlockSelect(e) {
      const sectionId = e.detail.sectionId;
      const blockId = e.detail.blockId;

      switch (sectionId) {
        case 'index-header-slider': {
          const $carousel = $(app.selectors.carousel);
          const flkty = Flickity.data($carousel[0]);
          const cellElements = flkty.getCellElements();

          flkty.pausePlayer();

          cellElements.forEach((element, index) => {
            const cellId = $(element).data('block-id');

            if (parseFloat(blockId) === parseFloat(cellId)) {
              flkty.selectCell(index, true, true); // value, isWrapped, isInstant
            }
          });
          break;
        }
        default: {
          break;
        }
      }
    },

    _onBlockDeselect(e) {
      const sectionId = e.detail.sectionId;
    },

  },
};

export default sectionMethods;
