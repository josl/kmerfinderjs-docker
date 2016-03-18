'use strict';

describe('Controller: RingtrialsCtrl', function () {

  // load the controller's module
  beforeEach(module('cgeUploaderApp'));

  var RingtrialsCtrl,
    scope;

  // Initialize the controller and a mock scope
  beforeEach(inject(function ($controller, $rootScope) {
    scope = $rootScope.$new();
    RingtrialsCtrl = $controller('RingtrialsCtrl', {
      $scope: scope
      // place here mocked dependencies
    });
  }));

  it('should attach a list of awesomeThings to the scope', function () {
    expect(RingtrialsCtrl.awesomeThings.length).toBe(3);
  });
});
