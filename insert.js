'use strict';

var Writable = require('readable-stream/writable');
var url = require('url');
var util = require('util');
var async = require('async');
var spawn = require('child_process').spawn;
var once = require('one-time');
var semver = require('semver');
var bl = require('bl');
var debug = require('diagnostics')('registry-migrate:insert');

//
// XXX: Maybe do something smarter than spawning `npm publish` in the future
//
module.exports = Insert;

util.inherits(Insert, Writable);

function Insert(opts) {
  Writable.call(this, { objectMode: true });

  this.destination = opts.destination || opts;
  if (typeof this.destination !== 'string')
    throw new Error('destination must be a string');

  this.parsed =  url.parse(this.destination);
  if (opts.auth || this.parsed.auth)
    this.auth = new Buffer(opts.auth || this.parsed.auth, 'utf8').toString('base64');
  this.parsed.auth = undefined;
  this.destination = this.parsed.format().replace(/\/+$/, '');

}

/**
 * Implement a writable stream that publishes packages in version order
 */
Insert.prototype._write = function (data, enc, callback) {
  var name = data.name;
  var versions = data.versions;
  var keys = Object.keys(versions).sort(compare);

  debug('publishing %d versions of %s', keys.length, name);

  async.eachSeries(keys, (version, next) => {
    this.publish(versions[version], next);
  }, callback);
};


Insert.prototype.publish = function (dir, callback) {
  var fn = once(callback);
  //
  // Publish a package. This should hit destination without issue
  // since we remove any possible `.npmrc` we may want to use a path to an
  // `.npmrc` if this is not sufficient
  //
  var args = ['publish'];
  var env = Object.keys(process.env).reduce(function (acc, key) {
    acc[key] = process.env[key];
    return acc;
  }, {});
  //
  //
  // Set the destination to the proper env
  //
  env.npm_config_registry = this.destination;

  if (this.auth) {
    args.push('--_auth=' + this.auth);
  }

  var child = spawn('npm', args, {
    env: env,
    //
    // Figure out if we need more options
    //
    cwd: dir
  });

  child.on('error', fn);
  child.stderr.pipe(bl(function (err, data) {
    if (err) { return fn(err); }
    if (data && data.length) {
      debug('Stderr output %s', data.toString());
      fn();
    }
  }));

  child.stdout.on('data', function () {});

  child.on('exit', function (code, signal) {
    if (code != 0) {
      return fn(new Error('Child exited with code '+code+' and Signal '+(signal || 'none')));
    }
    fn();
  });

};

function compare(a, b) {
  return semver.lt(a, b) ? -1 : 1;
}
