'use strict';

describe('Service: UID', function () {

  // load the service's module
  beforeEach(module('cgeUploaderApp'));

  // instantiate service
  var UID;
  beforeEach(inject(function (_UID_) {
    UID = _UID_;
  }));

  it('should do something', function () {
    expect(!!UID).toBe(true);
  });

});
