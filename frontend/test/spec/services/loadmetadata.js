'use strict';

describe('Service: LoadMetadata', function () {

  // load the service's module
  beforeEach(module('cgeUploaderApp'));

  // instantiate service
  var LoadMetadata;
  beforeEach(inject(function (_LoadMetadata_) {
    LoadMetadata = _LoadMetadata_;
  }));

  it('should do something', function () {
    expect(!!LoadMetadata).toBe(true);
  });

});
