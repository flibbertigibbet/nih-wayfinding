(function () {
    'use strict';

    /* ngInject */
    function OverviewController(Directions, Map, MapStyle, NavbarConfig) {
        var ctl = this;
        initialize();

        function initialize() {
            NavbarConfig.set({ title: 'Preview Route' });
            ctl.map = Map;
            Directions.get().then(setGeojson);
        }

        function routeStyle(feature) {
            if (feature.geometry.type !== 'LineString') {
                return;
            }
            var lastModified = feature && feature.properties ? feature.properties.lastModified : 0;
            var color = MapStyle.getLineColor(lastModified);
            return {
                color: color,
                weight: 4,
                opacity: 1
            };
        }

        function setGeojson(geojson) {
            angular.extend(ctl.map, {
                geojson: {
                    data: geojson,
                    style: routeStyle,
                    resetStyleOnMouseout: true
                }
            });
        }
    }

    angular.module('nih.views.routing')
    .controller('OverviewController', OverviewController);

})();