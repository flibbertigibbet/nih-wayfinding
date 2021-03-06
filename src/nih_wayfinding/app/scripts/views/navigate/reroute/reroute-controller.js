(function () {
    'use strict';

    /* ngInject */
    function RerouteController($state, Rerouting, NavbarConfig) {
        var ctl = this;
        initialize();

        function initialize() {
            NavbarConfig.set({
                title: 'Reroute',
                color: NavbarConfig.colors.reroute,
                back: 'navigate'
            });
            ctl.gridOptions = Rerouting.getReroutingOptions();
            ctl.optionClicked = optionClicked;
        }

      function optionClicked(option) {
          rerouteWith(option);
      }

      function rerouteWith(option) {
          $state.go('reroute-list', {type: option.text});
      }
    }

    angular.module('nih.views.navigate')
      .controller('RerouteController', RerouteController);

})();
