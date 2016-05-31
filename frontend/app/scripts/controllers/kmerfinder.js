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
          $scope.error = false;
          $scope.errorMessage = '';
          $scope.analize = function () {
              console.log($scope.isolateFiles);
              if ($scope.isolateFiles && $scope.isolateFiles.length) {
                  angular.forEach($scope.isolateFiles, function(file) {
                      console.log(file);
                    //   $http.get(API.url);
                      var kmerjs = new kmerModule.KmerFinderClient(
                          file, 'browser', 'ATGAC', 16, 1, 1, true, 'server',
                          API.url + 'kmers', '', 'KmerBacteria', 'Kmers');
                      $scope.fileProgress = kmerjs.lines;
                      // Own reading file function
                      console.log(kmerjs);
                      var kmers = kmerjs.findKmers();
                      kmers.event.on('progress', function() {
                          file.lines = kmerjs.lines;
                          file.kmers = kmerjs.kmerMap.size;
                          file.dataRead = kmerjs.fileDataRead * 100 / file.size;
                          $scope.$apply();
                      });
                      kmers.promise.then(function (kmers) {
                            console.log('Let\'s find some matches! ');
                            return kmerjs.findMatches(kmers);
                        })
                        .then(function (response) {
                            // TODO: Chech status code
                            // ans.toJSON()
                            console.log('resolved!');
                            var data = '';
                            response
                                .on('data', function(chunk) {
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
                        })
                        .catch(function (error) {
                            console.log(error);
                            $scope.error = true;
                            $scope.errorMessage = error;
                            $scope.$apply();
                        });
                      });
                  }
              };
          }]);
