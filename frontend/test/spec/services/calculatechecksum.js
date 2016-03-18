'use strict';

describe('Service: CalculateCheckSum', function () {

  // load the service's module
  beforeEach(module('cgeUploaderApp'));

  // instantiate service
  var CalculateCheckSum;
  beforeEach(inject(function (_CalculateCheckSum_) {
    CalculateCheckSum = _CalculateCheckSum_;
  }));

  it('should do something', function () {
    expect(!!CalculateCheckSum).toBe(true);
  });

});
