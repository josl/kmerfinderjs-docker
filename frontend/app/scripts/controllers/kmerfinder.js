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
          $scope.message = {text: '', status: 0};
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
                      var kmerObj = kmerjs.findKmers();
                      kmerObj.event.on('progress', function() {
                          file.lines = kmerjs.lines;
                          file.kmers = kmerjs.kmerMap.size;
                          file.dataRead = kmerjs.fileDataRead * 100 / file.size;
                          $scope.$apply();
                      });

                      kmerObj.promise
                        .then(function (kmers) {
                            console.log('Let\'s find some matches! ');
                            return kmerjs.findMatches(kmers);
                        })
                        .then(function (response) {
                            console.log('We are done here!!');
                            var matchesData = '';
                            response
                                .on('data', function(chunk) {
                                    matchesData += chunk.toString();
                                    // compressed data as it is received
                                    console.log('received ' + chunk.length + ' bytes of compressed data')
                                })
                                .on('end', function() {
                                    var matchesJSON = JSON.parse(matchesData);
                                    file.species = matchesJSON[0].species;
                                    file.match = true;
                                    file.matchesGrid.data = matchesJSON;
                                    $scope.message.text = 'All matches recevied!';
                                    $scope.message.status = 3;
                                    $scope.$apply();
                                });
                        })
                        .catch(function (error) {
                            console.log('ERROR!!', error);
                            $scope.message.text = error;
                            $scope.message.status = 2;
                            $scope.$apply();
                        });
                      });
                  }
              };
          }]);
