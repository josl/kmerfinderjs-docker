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
                console.log(scope, element, attrs, scope.isolateFiles);
                scope.tabs = scope.$parent.tabs;
                scope.filesValid = false;
                scope.isService = attrs.isService;
                scope.parsedFiles = 0;
                scope.dropping = function ($files) {
                    if ($files.length !== 0){
                        console.log('Start parsing');
                        scope.$broadcast('startParsing', $files);
                    }
                };
                scope.validate = function ($file) {
                    // console.log(scope.isolateFiles, $file);
                    $file.match = false;
                    $file.species = '';
                    $file.firstTime = ($file.firstTime? false: true);
                    $file.matchesGrid = {
                        showGridFooter: true,
                        enableSorting: true,
                        cellEditableCondition: true,
                        onRegisterApi: function(gridApi) {
                            console.log(gridApi);
                            $file.gridApi = gridApi;
                        },
                        columnDefs: [
                            {field: 'species', width: '50%'},
                            {field: 'template', width: '20%'},
                            {field: 'score', width: '10%'},
                            {field: 'expected', width: '10%'},
                            {field: 'z', width: '10%'},
                            {field: 'probability', width: '10%'},
                            {field: 'frac-q', width: '12%'},
                            {field: 'frac-d', width: '12%'},
                            {field: 'depth', width: '10%'},
                            {field: 'kmers-template', width: '10%'},
                            {field: 'total-frac-d', width: '10%'},
                            {field: 'total-frac-q', width: '10%'},
                            {field: 'total-temp-cover', width: '10%'},

                        ],
                        data: []
                    };
                    $file.status = {
                        isFirstOpen: true,
                        isFirstDisabled: false
                    };
                    // console.log('LALALALALALALAL', scope.parsedFiles === scope.isolateFiles, scope.isolateFiles);
                    // Inmmeditely starts parsing
                    // if ($file.firstTime){
                    //     scope.parsedFiles++;
                    //     // scope.$broadcast('newFile', $file);
                    // }
                    return true;
                };
            }
        };
    });
