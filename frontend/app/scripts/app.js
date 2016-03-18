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
  .config(function ($routeProvider) {
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
  });
