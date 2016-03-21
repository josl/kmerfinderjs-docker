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
                            {field: 'species', width: '50%'},
                            {field: 'template', width: '20%'},
                            {field: 'score', width: '10%'},
                            // {field: 'expected', width: '15%'},
                            // {field: 'z', width: '15%'},
                            {field: 'probability', width: '10%'},
                            // {field: 'frac-q', width: '15%'},
                            // {field: 'frac-d', width: '15%'},
                            // {field: 'coverage', width: '18%'},
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
