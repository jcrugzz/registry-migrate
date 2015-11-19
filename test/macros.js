'use strict';

var assume = require('assume');
var Fetch = require('../fetch');
var Modify = require('../modify');
var toReadable = require('..').toReadable;
var helpers = require('./helpers');
var Verify = require('./helpers').VerifyFetchStream;
var cleanup = require('./helpers').cleanup;
var ls = require('list-stream');

var macros = exports;

macros.fetchAndUntar = opts => done => {
  helpers.fetch(opts)
    .on('error', function (err) {
      assume(err).to.be.falsey();
      done(err);
    })
    .pipe(ls.obj(done));
};

macros.fetchAndModify = opts => done => {
  helpers.fetchAndModify(opts)
    .on('error', onError)
    .pipe(ls.obj(done));

  function onError(err) {
    assume(err).to.be.falsey();
    done(err);
  }
};
