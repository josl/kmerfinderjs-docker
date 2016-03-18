'use strict';

describe('Service: ValidateMetadata', function () {

  // load the service's module
  beforeEach(module('cgeUploaderApp'));

  // instantiate service
  var ValidateMetadata;
  beforeEach(inject(function (_ValidateMetadata_) {
    ValidateMetadata = _ValidateMetadata_;
  }));

  it('should do something', function () {
    expect(!!ValidateMetadata).toBe(true);
  });

});
