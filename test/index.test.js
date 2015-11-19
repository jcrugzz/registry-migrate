'use strict';

var migrate = require('..');
var registry = require('registry-mock');
var assume = require('assume');
var async = require('async');
var cleanup = require('./helpers').cleanup;

describe('index.test', function () {
  this.timeout(3E5);
  var reg;

  before(done => {
    registry({ http: 1337 }, (err, regis) => {
      reg = regis;
      done(err);
    });
  });

  after(done => {
    async.parallel([
      async.apply(cleanup),
      reg.close.bind(reg)
    ], done);
  });

  it('should be able to migrate a set of given packages from source -> dest', done => {
    migrate({
      source: 'https://registry.npmjs.org',
      destination: 'http://localhost:1337',
      packages: ['changes-stream', 'hyperquest']
    }, err => {
      assume(err).to.be.falsey();
      done();
    });
  });


});
