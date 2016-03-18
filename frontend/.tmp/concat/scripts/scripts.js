'use strict';

/**
 * @ngdoc overview
 * @name cgeUploaderApp
 * @description
 * # cgeUploaderApp
 *
 * Main module of the application.
 */
angular
  .module('cgeUploaderApp', [
    'ngAnimate',
    'ngCookies',
    'ngMessages',
    'ngResource',
    'ngRoute',
    'ngSanitize',
    'ngTouch',
    'ngFileUpload',
    'ui.bootstrap',
    'ui.grid',
    'ui.grid.resizeColumns',
    'ui.grid.autoResize',
    'cgeUploaderApp.config',
  ])
  .config(["$routeProvider", function ($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl: 'views/kmerfinder.html',
        controller: 'KmerFinderCtrl',
        controllerAs: 'kmerfinder'
      })
      .otherwise({
        redirectTo: '/'
      });
      // Cross Site Request Forgery protection
    //   $httpProvider.defaults.xsrfCookieName = 'csrftoken';
    //   $httpProvider.defaults.xsrfHeaderName = 'X-CSRFToken';
    //   $httpProvider.defaults.headers.common['X-Requested-With'] = 'XMLHttpRequest';
  }]);

'use strict';

/**
 * @ngdoc function
 * @name cgeUploaderApp.controller:ServiceuploaderCtrl
 * @description
 * # ServiceuploaderCtrl
 * Controller of the cgeUploaderApp
 */
angular.module('cgeUploaderApp')
  .controller('KmerFinderCtrl', [
      '$scope', 'API', '$http',
      function ($scope, API, $http) {
          console.log(API);
          $scope.isolateFiles = [];
          $scope.matches = false;
          $scope.analize = function () {
              console.log($scope.isolateFiles);
              if ($scope.isolateFiles && $scope.isolateFiles.length) {
                  angular.forEach($scope.isolateFiles, function(file) {
                      console.log(file);
                    //   $http.get(API.url);
                      var kmerjs = new kmerModule.KmerFinderClient(
                          file, 'browser', 'ATGAC', 16, 1, 1, '', 'mongo',
                          API.url + 'kmers');
                      // Own reading file function
                      console.log(kmerjs);
                      kmerjs.findKmers().then(function(kmerObj){
                          console.log(kmerObj, kmerModule);
                        //   var json = kmerModule.KmerFinderClient._kmersJs.mapToJSON(kmerObj);
                          kmerjs.findMatches(kmerObj).then(function(response) {
                              // TODO: Chech status code
                              // ans.toJSON()
                              var data = '';
                              response.on('data', function(chunk) {
                                  // compressed data as it is received
                                  console.log('received ' + data.length + ' bytes of compressed data');
                                  data += chunk;
                              })
                              .on('end', function () {
                                  var arrayMatches = JSON.parse(data);
                                  console.log(arrayMatches);
                                  console.log(file);
                                  file.species = arrayMatches[0].species;
                                  file.match = true;
                                  file.matchesGrid.data = arrayMatches;
                                  $scope.$apply();
                              });
                          });
                      });
                  });
              }
          };
  }]);

'use strict';

/**
 * @ngdoc directive
 * @name cgeUploaderApp.directive:dropFilesButton
 * @description
 * # dropFilesButton
 */
angular.module('cgeUploaderApp')
    .directive('dropFilesButton', function () {
        return {
            templateUrl: 'templates/dropFilesButton.html',
            restrict: 'E',
            link: function postLink(scope, element, attrs) {
                // console.log(scope, element, attrs, scope.isolateFiles);
                scope.tabs = scope.$parent.tabs;
                scope.filesValid = false;
                scope.isService = attrs.isService;
                scope.validate = function ($file) {
                    console.log(scope.isolateFiles, $file);
                    $file.match = false;
                    $file.species = '';
                    $file.matchesGrid = {
                        showGridFooter: true,
                        enableSorting: true,
                        cellEditableCondition: true,
                        columnDefs: [
                            {field: 'species', width: '30%'},
                            {field: 'template', width: '10%'},
                            {field: 'score', width: '10%'},
                            {field: 'expected', width: '15%'},
                            {field: 'z', width: '15%'},
                            {field: 'probability', width: '10%'},
                            {field: 'frac-q', width: '15%'},
                            {field: 'frac-d', width: '15%'},
                            {field: 'coverage', width: '18%'},
                            {field: 'ulength', width: '10%'},
                        ],
                        data: []
                    };
                    $file.status = {
                        isFirstOpen: true,
                        isFirstDisabled: false
                      };
                    return true;
                    // if (scope.isService === 'false'){
                    //     return _.contains(scope.templateFiles, $file.name);
                    // }else {
                    //     scope.isolateFiles.push($file);
                    //     return true;
                    // }
                };
            }
        };
    });

angular.module('cgeUploaderApp').run(['$templateCache', function($templateCache) {
  'use strict';

  $templateCache.put('views/kmerfinder.html',
    "<div ng-controller=\"KmerFinderCtrl\"> <div class=\"jumbotron\"> <h1 class=\"text-center\"> <span style=\"color: #3f51b5\">KmerFinder</span> <span style=\"color: #ff5722\">JS</span> </h1> <!-- <p>...</p>\n" +
    "        <p><a class=\"btn btn-primary btn-lg\" href=\"#\" role=\"button\">Learn more</a></p> --> </div> <drop-files-button active=\"true\" is-service=\"true\"></drop-files-button> <div ng-show=\"isolateFiles.length !== 0\" class=\"well well-lg\"> <p class=\"text-center\"> <button id=\"submitButton\" ng-click=\"analize()\" type=\"button\" class=\"btn btn-material-indigo-500 btn-lg btn-block\"> Predict Species </button> </p> <div ng-repeat=\"f in isolateFiles\"> <h3 ng-show=\"f.match\" class=\"text-center\">Congrats! You got a <span style=\"color: #ff5722\">{{f.species}}</span> </h3> <div ng-show=\"f.match\" ui-grid=\"f.matchesGrid\" class=\"myGrid\" ui-grid-auto-resize></div> <!-- <uib-accordion>\n" +
    "                <uib-accordion-group is-open=\"f.status\">\n" +
    "                    <uib-accordion-heading>\n" +
    "                        I can have markup, too!\n" +
    "                        <i class=\"pull-right glyphicon\" ng-class=\"{'glyphicon-chevron-down': f.status.open, 'glyphicon-chevron-right': !f.status.open}\"></i>\n" +
    "                    </uib-accordion-heading>\n" +
    "                    This is just some content to illustrate fancy headings.\n" +
    "                </uib-accordion-group>\n" +
    "            </uib-accordion> --> </div> </div> </div>"
  );

}]);
