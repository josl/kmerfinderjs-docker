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
