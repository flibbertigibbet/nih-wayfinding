(function () {
    'use strict';

/*
    TODO: Show notification when any of the promises in this controller are rejected
        Causes for rejection include:
            - User disallows geolocation when necessary
            - Error getting routing data
*/

    /* ngInject */
    function OverviewController($scope, $stateParams, $q, leafletData,
                                Config, Directions, Map, MapControl, MapStyle, NavbarConfig,
                                Navigation, Notifications, ProfileService) {
        var ctl = this;
        var currentUser = null;
        var defaultNonZeroWalkTime = 30;
        var mphToMs = 0.44704;
        var directionsOptions = {
            walkTimeMins: 0,
            wheelchair: false
        };
        initialize();

        function initialize() {
            NavbarConfig.set({
                title: 'Preview Route',
                back: 'locations'
            });
            ctl.map = Map;
            ctl.summary = {
                timeMinutes: 0,
                distanceMeters: 0,
                turns: 0
            };
            currentUser = ProfileService.getCurrentUser();
            angular.extend(ctl.map.center, Config.center);
            angular.extend(ctl.map.bounds, Config.bounds);
            drawGraphBounds();
            ctl.stateParams = $stateParams;
            readStateParams().then(getDirections);

            $scope.$on('leafletDirectiveMap.geojsonClick', showPopup);
        }

        function getDirections(data) {
            var options = angular.extend({}, directionsOptions, {
                wheelchair: !!(currentUser.preferences.wheelchairRequired),
                walkSpeed: currentUser.preferences.speed * mphToMs
            });
            Directions.get(data.origin, data.destination, options).then(setGeojson, function (error) {
                var msg = error.msg ? error.msg : 'Unable to load route. Please try again later.';
                Notifications.show({
                    text: msg,
                    timeout: 3000
                });
            });
        }

        /**
         * Fetch the graph bounds and draw its outline
         */
        function drawGraphBounds() {
            MapControl.getGraphBounds().then(function(geojson) {
                angular.extend(ctl.map, {
                    geojson: {
                        data: geojson,
                        style: MapStyle.getBoundsStyle(),
                    }
                });
            }, function (error) {
                console.error('Could not get graph bounds from OTP');
                console.error(error);
            });
        }

        /**
         * Read origin and destination params to make routing request
         * If origin and dest: use both
         * Otherwise: use currentlocation to fill the blanks
         */
        function readStateParams() {
            var dfd = $q.defer();
            var destination = MapControl.cleanLonLatParam($stateParams.destination);
            var origin = MapControl.cleanLonLatParam($stateParams.origin);
            directionsOptions.walkTimeMins = $stateParams.walkTimeMins || 0;

            if (origin && destination) {
                dfd.resolve({
                    origin: origin,
                    destination: destination
                });
            } else {
                Navigation.getCurrentPosition({}).then(function (position) {
                    var currentPosition = [position.coords.longitude, position.coords.latitude];
                    if (!destination) {
                        destination = currentPosition;
                    }
                    if (!origin) {
                        origin = currentPosition;
                    }
                    if (_.isEqual(origin, destination)) {
                        directionsOptions.walkTimeMins = defaultNonZeroWalkTime;
                    }
                    dfd.resolve({
                        origin: origin,
                        destination: destination
                    });
                });
            }
            return dfd.promise;
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
                opacity: 1,
                clickable: false
            };
        }

        function setGeojson(geojson) {
            if (!(geojson && geojson.features.length)) {
                Notifications.show({
                    text: 'No valid route found. Please go back and try again.'
                });
                return;
            }
            var bbox = turf.extent(geojson);
            if (!Directions.isAudited(geojson)) {
                Notifications.show({
                    text: 'This route contains unverified segments. Please exercise caution.'
                });
            }
            angular.extend(ctl.map, {
                bounds: {
                    southWest: {
                        lat: bbox[1],
                        lng: bbox[0]
                    },
                    northEast: {
                        lat: bbox[3],
                        lng: bbox[2]
                    }
                },
                geojson: {
                    data: geojson,
                    style: routeStyle,
                    resetStyleOnMouseout: true
                }
            });
            ctl.summary = angular.extend(ctl.summary, Directions.getRouteSummary());
        }

        function showPopup(event, feature) {
            MapControl.showPopup(feature);
        }
    }

    angular.module('nih.views.routing')
    .controller('OverviewController', OverviewController);

})();
