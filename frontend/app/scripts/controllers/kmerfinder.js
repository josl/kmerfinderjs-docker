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
        //   var socket = io.connect(API.url);
          $scope.analize = function () {
              console.log($scope.isolateFiles);
              if ($scope.isolateFiles && $scope.isolateFiles.length) {
                  angular.forEach($scope.isolateFiles, function(file) {
                      console.log(file);
                    //   $http.get(API.url);
                      var kmerjs = new kmerModule.KmerFinderClient(
                          file, 'browser', 'ATGAC', 16, 1, 1, true, 'server',
                          API.url + '', '', 'KmerBacteria', 'Kmers');
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
                            var matches = kmerjs.findMatches(kmers);
                            matches.event.on('queryReceived', function () {
                                $scope.message.text = 'Query recevied! Calculating matches...';
                                $scope.message.status = 1;
                                console.log('queryReceived');
                                $scope.$apply();
                            });
                            matches.event.on('newMatch', function (match) {
                                console.log('newMatch');
                                if (file.matchesGrid.data.length === 0){
                                    file.species = match.species;
                                    file.match = true;
                                }
                                file.matchesGrid.data.push(match);
                                $scope.$apply();
                            });
                            return matches.promise;
                        })
                        .then(function (response) {
                            // TODO: Chech status code
                            // ans.toJSON()
                            console.log('We are done here!!', response);
                            $scope.message.text = 'All matches recevied!';
                            $scope.message.status = 3;
                            $scope.$apply();
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
