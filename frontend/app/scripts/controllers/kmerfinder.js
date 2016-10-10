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
      '$scope', 'API', '$q',
      function ($scope, API, $q) {
          console.log(API);
          $scope.isolateFilesPromises = [];
          $scope.matches = false;
          $scope.error = false;
          $scope.message = {text: '', status: 0};

          $scope.$on('startParsing', function (event, files){
              var index = -1;
              var parseFiles = function() {
                  console.log(index, files.length - 1, files);
                  if (index >= files.length - 1) {
                    return;
                } else {
                    index++;
                    return $scope.parseFile(files[index])
                                 .then(parseFiles)
                                 .catch(function (error) {
                                      console.log('ERROR!!', error);
                                      $scope.message.text = error;
                                      $scope.message.status = 2;
                                      $scope.$apply();
                                  });
                }

              };
              parseFiles();
          });
          $scope.parseFile = function(file) {
              console.log(file);
              var kmerjs = new kmerModule.KmerFinderClient(
                  file, 'browser', 'ATGAC', 16, 1, 1, true, 'server',
                  API.url + 'kmers', '', 'KmerBacteria', 'Kmers');
              $scope.fileProgress = kmerjs.lines;
              var kmerObj = kmerjs.findKmers();

              kmerObj.event.on('progress', function(progress) {
                //   console.log(progress.transferred, file.size);
                  file.kmerSize = kmerjs.kmerMap.size;
                  file.dataRead = progress.transferred * 100 / file.size;
                  $scope.$apply();

              });

              return kmerObj.promise
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
                    return;
                });
          };
  }]);
