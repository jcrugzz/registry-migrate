'use strict';

var assume = require('assume');
var async = require('async');
var Insert = require('../insert');
var mockRegistry = require('registry-mock');
var cleanup = require('./helpers').cleanup;
var fetchAndModify = require('./helpers').fetchAndModify;

describe('insert.test', function () {
  this.timeout(3E5);

  var registry;
  before(done => {
    mockRegistry({ http: 1337 }, (err, reg) => {
      registry = reg;
      done(err);
    })
  });

  after(done => {
    async.parallel([
      async.apply(cleanup),
      registry.close.bind(registry)
    ], done);
  });

  it('should correctly insert into fake registry', function (done) {
    fetchAndModify()
      .pipe(new Insert('http://user:pass@localhost:1337'))
      .on('error', function (err) {
        assume(err).to.be.falsey();
        done(err);
      })
      .on('finish', done);
  })
});

