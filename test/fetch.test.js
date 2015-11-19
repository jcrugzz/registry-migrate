'use strict';

var path = require('path');
var assume = require('assume');
var rimraf = require('rimraf');
var async = require('async');

var helpers = require('./helpers');
var macros = require('./macros');

describe('fetch.test', function () {
  this.timeout(3E5);
  var limit = 2;

  afterEach(function (done) {
    helpers.cleanup(done);
  });

  it('should fetch and unpack packages when given a list of packages',
    macros.fetchAndUntar({
      dir: helpers.dir,
      limit: limit,
      packages: helpers.packages
    })
  );
});
