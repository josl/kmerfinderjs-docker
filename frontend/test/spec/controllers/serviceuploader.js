'use strict';

describe('Controller: ServiceuploaderCtrl', function () {

  // load the controller's module
  beforeEach(module('cgeUploaderApp'));

  var ServiceuploaderCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    ServiceuploaderCtrl = $controller('ServiceuploaderCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(ServiceuploaderCtrl.awesomeThings.length).toBe(3);
  });
});
