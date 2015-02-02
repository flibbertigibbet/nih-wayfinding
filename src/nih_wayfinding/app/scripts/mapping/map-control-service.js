(function (_) {
    'use strict';

    function MapControl ($http, $q, Config, leafletData) {
        var popup = null;
        var boundsUrl = Config.routing.hostname + '/otp/routers/default';
        var userMarker = null;

        var module = {
            cleanLonLatParam: cleanLonLatParam,
            getGraphBounds: getGraphBounds,
            pointToLngLat: pointToLngLat,
            showPopup: showPopup,
            trackUser: trackUser,
            markLocation: markLocation,
            purgeMarkers: purgeMarkers
        };

        return module;

        /**
         * Cleans string of form 'lon,lat' to an array of form [lon, lat]
         *
         * @param lonLat {string} String value to clean
         * @returns {array} [lon, lat] or null if string could not be parsed
         */
        function cleanLonLatParam(lonLat) {
            if (!(lonLat && lonLat.split)) {
                return null;
            }
            lonLat = lonLat.split(',');
            var lon = parseFloat(lonLat[0]);
            var lat = parseFloat(lonLat[1]);
            if (isNaN(lon) || isNaN(lat)) {
                return null;
            } else {
                return [lon, lat];
            }
        }

        /**
         * Get the graph bounds from the OTP server
         *
         * @returns {geojson} Graph bounds polygon
         */
        function getGraphBounds() {
            var dfd = $q.defer();
            $http.get(boundsUrl, {
                cache: true
            }).then(function (response) {
                var boundsPolygon = response.data.polygon;
                if (boundsPolygon) {
                    dfd.resolve(boundsPolygon);
                } else {
                    dfd.reject(response.data.error);
                }
            });

            return dfd.promise;
        }

        function pointToLngLat(pointFeature) {
            return pointFeature.geometry.coordinates;
        }

        /**
         * Shows popup with text of a single feature property, denoted by key
         *  TODO: Make more robust if this function makes it out of the prototype
         *
         * @param feature {object} geojson feature to display
         * @param key {string} key for the properties object to show in popup
         * @return undefined Shows popup or does nothing if feature not a Point
         */
        function showPopup(feature, key) {
            key = key || 'type';
            if (feature.geometry.type !== 'Point') {
                return;
            }
            leafletData.getMap().then(function(map) {
                if (popup) {
                    map.closePopup();
                    popup = null;
                }
                popup = L.popup()
                .setLatLng([feature.geometry.coordinates[1], feature.geometry.coordinates[0]])
                .setContent(feature.properties[key])
                .openOn(map);
            });
        }

        function purgeMarkers(locations) {
            leafletData.getMap().then(function(map) {
                _(locations).forEach(function(loc) {
                    map.removeLayer(loc);
                });
            });
        }

        /**
         * For a given point, attach a location marker on that point
         *
         * @param point {array} [Lng, Lat] array of coordinates
         * @param onClick {function} The function to be called when this marker is clicked upon.
         *                             This function should take the event object as its sole argument.
         * @return {object} (promise) The marker displayed on map (returned so that it might be stored)
         *
         */
        function markLocation(point, onClick) {
            var deferred = $q.defer();
            leafletData.getMap().then(function(map) {
                var lnglat = [point[1], point[0]];
                var locationMarker = new L.Marker(lnglat);
                if (onClick) { locationMarker.on('click', onClick); }
                map.addLayer(locationMarker);
                deferred.resolve(locationMarker);
            });
            return deferred.promise;
        }

        /**
         * For a given point attach a user marker on that point
         *
         * @param point {array} [Lng, Lat] array of coordinates
         * @return undefined Shows (or moves) a marker
         */
        function trackUser(point) {
            leafletData.getMap().then(function(map) {
                var lnglat = [point[1], point[0]];
                if (userMarker) {
                  userMarker.setLatLng(lnglat);
                } else {
                  userMarker = new L.CircleMarker(lnglat);
                  map.addLayer(userMarker);
                }
            });
        }
    }

    angular.module('nih.mapping')
      .factory('MapControl', MapControl);

})(_);
