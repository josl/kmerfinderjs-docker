'use strict';
/* jshint ignore:start */
// Code here will be ignored by JSHint.

/* https://github.com/angular/protractor/blob/master/docs/toc.md */

describe('my app', function() {


  // it('should automatically redirect to /view1 when location hash/fragment is empty', function() {
  //   browser.get('index.html');
  //   expect(browser.getLocationAbsUrl()).toMatch("/view1");
  // });
  //
  //
  // describe('view1', function() {
  //
  //   beforeEach(function() {
  //     browser.get('index.html#/view1');
  //   });
  //
  //
  //   it('should render view1 when user navigates to /view1', function() {
  //     expect(element.all(by.css('[ng-view] p')).first().getText()).
  //       toMatch(/partial for view 1/);
  //   });
  //
  // });


  describe('Upload excel, files and submit', function() {

    beforeEach(function() {
      browser.get('#/batchUploader2');
    });

    var path = require('path');
    it('should have metadata file accepted', function() {
        var excelsheet = 'test_data/ONE_test_batch.xlsx';
        // element(by.id('excelUploadBox')).click();
        element(by.id('excelUploadBox')).click();
        element(by.id('excelUploadBox')).sendKeys(path.resolve(__dirname, excelsheet));
        element(by.id('excelUploadBox')).click();
        browser.driver.sleep(5000);
        expect(element(by.id('metadataValid')).isDisplayed()).toBeTruthy();
    });

  });
});
/* jshint ignore:end */
