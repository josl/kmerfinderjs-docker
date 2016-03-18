exports.config = {
  allScriptsTimeout: 11000,

  specs: [
    'protractor.scenarios.js'
  ],

  capabilities: {
    'browserName': 'firefox'
  },

  seleniumAddress: 'http://localhost:4444/wd/hub',

  baseUrl: 'http://localhost:9000/',

  framework: 'jasmine2',

  jasmineNodeOpts: {
    defaultTimeoutInterval: 30000
  }
};
