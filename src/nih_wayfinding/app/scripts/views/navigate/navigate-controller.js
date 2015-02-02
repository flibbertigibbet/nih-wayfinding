/**
 *
 * This navigation controller does nothing, now that the Directions.get endpoint returns an
 * actual response. Rather than restub it out now, we can just properly build out the remainder
 * of the interactions on this view all at once.
 *
 * TODO:
 *   - Init map at current location navigating to destination param via Directions.get()
 *   - Add direction text, e.g. Turn left in x ft at 1000 Market St
 *   - When we approach each step, speak audible alert and then switch the current direction text
 *   - Offer to reroute user if they leave the current path
 */
(function () {
    'use strict';

    /* ngInject */
    function NavigateController(
        $filter, $scope, $stateParams,
        Navigation, Directions, Map, MapStyle, NavbarConfig, MapControl, Rerouting, Notifications, ProfileService, Config
    ) {
        var ctl = this;
        var mphToMs = 0.44704;
        var kmToM = 1000;
        initialize();

        function initialize() {
            setDefaultFooter();
            handleReroute($stateParams.reroute);
            NavbarConfig.set({
                title: 'Navigate Route',
                back: 'routing'
            });
            ctl.map = Map;
            ctl.nextStep = Navigation.stepNext;
            ctl.offCourse = Navigation.offCourse;

            // Subscribe to the location update event
            $scope.$on('nih.navigation.positionOffCourse', onPositionOffCourse);
            $scope.$on('nih.navigation.positionUpdated', onPositionUpdated);
            $scope.$on('$stateChangeStart', Navigation.stopIntervalTask);
        }

        function setDefaultFooter() {
            ctl.footer = {
                left:  {
                    text: 'Reroute',
                    func: function() { $state.go('reroute'); }
                },
                right: {
                    text: 'Report',
                    func: function() { $state.go('report'); }
                }
            };
        }

        /**
         *
         */
        function setRerouteFooter() {
            ctl.footer = {
                left:  {
                    text: 'Cancel',
                    func: clearReroute
                },
                right: {
                    text: 'Route',
                    func: planReroute
                }
            };
        }

        /**
         *
         */
        function planReroute() {
            var origin = Config.stubs.geolocation;
            var dest = ctl.rerouteDest;
            Directions.get([origin.latitude, origin.longitude], [dest.lat, dest.lng]).then(function(a,b) {console.log(a,b);});
            setDefaultFooter();
            console.log('plotting...');
        }

        /**
         *
         */
        function clearReroute() {
            MapControl.purgeMarkers(ctl.markedLocations);
            setDefaultFooter();
        }

        /**
         *
         */
        function handleReroute(rerouteType) {
            ctl.markedLocations = [];
            if (rerouteType) {
                setRerouteFooter();
                Rerouting.reroute(rerouteType).then(function(amenities) {
                    Notifications.show({
                        text: 'Select a the destination you\'d like to be routed to',
                        timeout: 3000
                    });
                    function registerMarker(rerouteDest) {
                        var latlng = rerouteDest.latlng;
                        ctl.rerouteDest = latlng;
                    }
                    _(amenities)
                      .take(5)
                      .forEach(function(amenity) {
                          var name = amenity.name;
                          var address = amenity.vicinity;
                          var geo = amenity.geometry.location;
                          MapControl.markLocation([geo.B, geo.k], registerMarker).then(function(marker) {
                              ctl.markedLocations = ctl.markedLocations.concat(marker);
                          });
                      });
                }, function(failure) {
                    setDefaultFooter();
                    Notifications.show({
                        text: 'Failed to find nearby amenities',
                        timeout: 3000
                    });
                });
            }
        }

        function setGeojson(geojson) {
            angular.extend(ctl.map, {
                geojson: {
                    data: geojson,
                    style: MapStyle.routeStyle,
                    resetStyleOnMouseout: true
                }
            });

            var geojson = ctl.map.geojson.data;
            Navigation.setRoute(geojson);
            Navigation.stepFirst();
        }

        function updateUserPosition(point) {
            MapControl.trackUser(point.geometry.coordinates);
            angular.extend(ctl.map.center, {
                lat: point.geometry.coordinates[1],
                lng: point.geometry.coordinates[0],
                zoom: 19
            });
        }

        function onPositionOffCourse(event, position) {
            updateUserPosition(position);

            NavbarConfig.set({
                title: 'You are off course. Tap "Reroute" to get new directions.',
                leftImage: 'glyphicon-warning-sign'
            });
        }

        function onPositionUpdated(event, position) {
            var point = position.point;
            updateUserPosition(point);

            // Find distance to next turn, and display directions text/time/distance in navbar
            var distanceToTurn = turf.distance(point, position.destination, 'kilometers') * kmToM;
            var text = position.properties.directions.text;
            var turnIcon = Directions.getTurnIconName(position.properties.directions.turn);
            var speedMs = (ProfileService.getCurrentUser().preferences.speed || 1) * mphToMs;
            var timeMins = (distanceToTurn / speedMs / 60).toFixed(0);
            var distanceText = 'In approximately ' +  timeMins + ' minutes (' + $filter('distance')(distanceToTurn) + ')';
            NavbarConfig.set({
                title: text,
                subtitle: distanceText,
                leftImage: turnIcon
            });
        }
    }

    angular.module('nih.views.navigate')
      .controller('NavigateController', NavigateController);

})();
