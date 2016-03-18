'use strict';

describe('Controller: Batchuploader2Ctrl', function () {

  // load the controller's module
  beforeEach(module('cgeUploaderApp'));

  var Batchuploader2Ctrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    Batchuploader2Ctrl = $controller('Batchuploader2Ctrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(Batchuploader2Ctrl.awesomeThings.length).toBe(3);
  });
});
