'use strict';

var fs = require('fs');
var path = require('path');
var parallel = require('parallel-transform');
var async = require('async');
var writeFile = require('write-file-atomic');
var debug = require('diagnostics')('registry-migrate:modify');

module.exports = Modify;

/**
 * Transform stream responsible for modifying the package.json files for the
 * built package data structures that come through it
 */
function Modify(options) {
  if (!(this instanceof Modify)) return new Modify(options, limit)

  this.limit = options.limit;

  this.stream = parallel(this.limit, this.transform.bind(this));

  this.stream._modify = this;

  return this.stream;
}

/**
 * Take the given object and transform each package.json into something
 * consumable by `npm publish`
 */
Modify.prototype.transform = function (data, callback) {
  debug('Modifying the package.json\'s for %s', data.name);

  async.eachLimit(Object.keys(data.versions), this.limit, (version, next) => {
    var dirPath = data.versions[version];

    //
    // clean up the directory before we publish
    //
    async.parallel([
      this.refresh.bind(this, dirPath),
      this.pluck.bind(this, dirPath)
    ], next);

  }, err => {
    callback(err, data);
  });
};

/**
 * See if there is an .npmrc, and delete it if it exists
 */
Modify.prototype.pluck = function (dir, callback) {
  var npmrc = path.join(dir, '.npmrc');
  fs.stat(npmrc, (err, stat) => {
    if (err && err.code === 'ENOENT') return callback();
    if (err) return callback(err);

    fs.unlink(npmrc, err => {
      callback(err);
    });
  });
};

/**
 * Refresh the package.json
 */
Modify.prototype.refresh = function (dirPath, callback) {
  var pkgPath = path.join(dirPath, 'package.json');

  this.read(pkgPath, (err, json) => {
    if (err) return callback(err);

    writeFile(pkgPath, JSON.stringify(this.strip(json)), callback);
  });

};

/**
 * Modify the properties of the package.json to strip all the nonsense that `npm
 * publish` creates
 */
Modify.prototype.strip = function (pkgJson) {
  delete pkgJson.publishConfig;
  return pkgJson;
};

/**
 * Read the package.json
 */
Modify.prototype.read = function (pkgPath, callback) {
  fs.readFile(pkgPath, 'utf8', function (err, contents) {
    if (err) return callback(err);

    var json = tryParse(contents);
    if (!json) return callback(new Error('JSON.parse error for ' + pkgPath));

    callback(null, json);
  });
};


//
// fuck just make this a module
//
function tryParse(data) {
  var json;

  try {
    json = JSON.parse(data);
  } catch (ex) {};

  return json;
}
