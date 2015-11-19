'use strict';

var fs = require('fs');
var path = require('path');
var pumpify = require('pumpify');
var Transform = require('readable-stream/transform');
var util = require('util');
var debug = require('diagnostics')('registry-migrate:test:fetch-verify');
var async = require('async');
var rimraf = require('rimraf');

var Fetch = require('../fetch');
var Modify = require('../modify');
var toReadable = require('..').toReadable;
var Verify = require('./helpers').VerifyFetchStream;
var cleanup = require('./helpers').cleanup;

var helpers = exports;

util.inherits(VerifyFetchStream, Transform);

function VerifyFetchStream(limit) {
  Transform.call(this, { objectMode: true });
  this.limit = limit;
};

VerifyFetchStream.prototype._transform = function (data, enc, callback) {
  var versions = data.versions;
  var keys = Object.keys(versions);
  debug('verifying %s, %d versions', data.name, keys.length);
  async.eachLimit(keys, this.limit, (key, next) => {
    var verPath = versions[key];
    fs.readdir(verPath, (err, files) => {
      if (err) return next(err);
      if (files.indexOf('package.json') == -1) return next(new Error('Invalid untar'));
      next();
    });
  }, err => {
    callback(err, data);
  });
};

helpers.VerifyFetchStream = VerifyFetchStream;

function VerifyModifyStream(limit) {
  return new Transform({
    objectMode: true,
    transform: (data, enc, callback) => {
      var versions = data.versions;
      var keys = Object.keys(versions);
      debug('verifying %s, %d versions', data.name, keys.length);
      async.eachLimit(keys, limit, (key, next) => {
        var verPath = versions[key];
        var pkg = require(path.join(verPath, 'package.json'));
        if (pkg.publishConfig) return next(new Error('Invalid package.json'));
        next();
      }, err => callback(err, data));
    }
  });
};

helpers.VerifyModifyStream = VerifyModifyStream;

helpers.dir = path.join(__dirname, 'resource');
helpers.packages = ['hyperquest', 'changes-stream'];

helpers.fetch = function (opts) {
  opts = opts || {};
  opts.limit = opts.limit || 2;
  var fetch = new Fetch('https://registry.npmjs.org', {
    limit: opts.limit,
    dir: opts.dir || helpers.dir
  });

  return toReadable(opts.packages || helpers.packages)
    .pipe(fetch)
    .pipe(new VerifyFetchStream(opts.limit))
};

helpers.modify = function (opts) {
  opts = opts || {};
  opts.limit = opts.limit || 2;

  return pumpify.obj(
    new Modify(opts),
    new VerifyModifyStream(opts.limit));
};

helpers.fetchAndModify = function (opts) {
  var modify = helpers.modify(opts);
  return helpers.fetch(opts)
    .on('error', modify.emit.bind(modify, 'error'))
    .pipe(modify);
};

helpers.cleanup = function cleanup(opts, callback) {
  if (typeof opts === 'function' && !callback) {
    callback = opts;
    opts = {};
  }

  var dir = opts.dir || helpers.dir;
  var packages = opts.packages || helpers.packages;
  async.each(packages, (pack, next) => {
    rimraf(path.join(dir, pack), next);
  }, callback);
};
