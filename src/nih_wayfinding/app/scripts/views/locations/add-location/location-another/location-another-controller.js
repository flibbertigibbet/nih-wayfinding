(function () {
    'use strict';

    /* ngInject */
    function LocationsAnotherController($state, NavbarConfig) {
        var ctl = this;
        initialize();

        function initialize() {
            NavbarConfig.set({ title: 'Custom Locations' });
            ctl.optionClicked = optionClicked;
            ctl.gridOptions = [
                {
                    text: 'Yes',
                    toState: 'locationsSelectType'
                },
                {
                    text: 'No thanks',
                    toState: 'locations'
                }
            ];
        }

      function optionClicked(option) {
          $state.go(option.toState);
      }

    }

    angular.module('nih.views.locations')
      .controller('LocationsAnotherController', LocationsAnotherController);

})();
