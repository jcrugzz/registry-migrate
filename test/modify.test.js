'use strict';

var assume = require('assume');
var cleanup = require('./helpers').cleanup;
var macros = require('./macros');
var ls = require('list-stream');

describe('modify.test', function () {
  this.timeout(3E5);
  afterEach(done => cleanup(done));

  it('should modify the files as expected', macros.fetchAndModify());
});
