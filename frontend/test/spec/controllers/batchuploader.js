'use strict';

describe('Controller: BatchuploaderCtrl', function () {

  // load the controller's module
  beforeEach(module('cgeUploaderApp'));

  var BatchuploaderCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    BatchuploaderCtrl = $controller('BatchuploaderCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(BatchuploaderCtrl.awesomeThings.length).toBe(3);
  });
});
