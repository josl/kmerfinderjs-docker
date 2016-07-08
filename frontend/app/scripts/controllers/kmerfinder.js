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
      function ($scope, API) {
          console.log(API);
          $scope.isolateFiles = [];
          $scope.matches = false;
          $scope.error = false;
          $scope.message = {text: '', status: 0};
          $scope.$on('newFile', function (event, file){
              console.log(event);
              var kmerjs = new kmerModule.KmerFinderClient(
                  file, 'browser', 'ATGAC', 16, 1, 1, true, 'server',
                  API.url + 'kmers', '', 'KmerBacteria', 'Kmers');
              $scope.fileProgress = kmerjs.lines;
              // Own reading file function
              console.log(kmerjs);
              console.log('reading!');
              var kmerObj = kmerjs.findKmers();
              kmerObj.event.on('progress', function(progress) {
                  file.kmerSize = kmerjs.kmerMap.size;
                  file.dataRead = progress.transferred * 100 / file.size;
                  $scope.$apply();
              });

              kmerObj.promise
                .then(function (kmers) {
                    console.log('Assigning kmers!');
                    file.kmers = kmers;
                    console.log('Let\'s find some matches! ');
                    return kmerjs.findFirstMatch(kmers);
                })
                .then(function (winner) {
                    console.log('Winner found!');
                    file.species = winner.species;
                    file.match = true;
                    kmerjs.progress = false;
                    var generator = kmerjs.findMatches(winner, file.kmers);
                    function run(generatorObject) {
                        if (!(winner = generatorObject.next()).done) {
                            file.matchesGrid.data.push(winner.value);
                            $scope.$apply();
                            // Add a new task to the event queue
                            setTimeout(function () {
                                run(generatorObject);
                            }, 10);
                        }
                    }
                    run(generator);
                })
                .catch(function (error) {
                    console.log('ERROR!!', error);
                    $scope.message.text = error;
                    $scope.message.status = 2;
                    $scope.$apply();
                });
          });
  }]);
