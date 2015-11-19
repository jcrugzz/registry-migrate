var baltar = require('baltar');
var hyperquest = require('hyperquest');
var concat = require('concat-stream');
var url = require('url');
var path = require('path');
var once = require('one-time');
var parallel = require('parallel-transform');
var async = require('async');
var debug = require('diagnostics')('registry-migrate:fetch');
var mkdirp = require('mkdirp');

module.exports = Fetch;

/**
 * A stream that fetches all of the packages given from the source registry
 */
function Fetch(source, opts) {
  if (!(this instanceof Fetch)) return new Fetch(source, opts)
  this.source = source;
  //
  // We probably want more than 1 limit here
  //
  this.limit = opts.limit;
  this.dir = opts.dir;

  //
  // Return the parallelized stream so we handle backpressure properly
  //
  this.stream = parallel(this.limit, this.transform.bind(this));

  this.stream._fetch = this;

  return this.stream;
}

/**
 * The transform function for a concurrent transform stream
 */
Fetch.prototype.transform = function transform(data, callback) {
  var name = data.name;
  //
  // 1. Get the full package with all versions and tarball URLs
  //
  this.get(name, (err, pkg) => {
    if (err) return callback(err);
    //
    // 2. Iterate through them all and pull and unpack them onto disk
    //
    mkdirp(path.join(this.dir, name), err => {
      if (err) return callback(err);
      this.iterate(name, pkg.versions, (err, built) => {
        //
        // 3. Return a data structure with the mappings to the full path to all
        // the versions
        // {
        //   name: 'package-name',
        //   versions: {
        //     '0.9.0': '/path/on/disk/0.9.0/package-name'
        //   }
        // }
        //
        callback(err, built);
      });
    });
  });
};

/**
 * Get a single package from the given source and store it at the given path
 */
Fetch.prototype.get = function (name, callback) {
  var fn = once(callback);
  debug('Get full package from registry');

  hyperquest(url.resolve(this.source, name))
    .on('error', fn)
    .pipe(concat({ encoding: 'string' }, function (data) {

      var pkg = tryParse(data);

      if (!pkg) return fn(new Error('Invalid data for ' + name));

      callback(null, pkg);
    }));
};

Fetch.prototype.iterate = function (name, versions, callback) {
  var built = {};
  built.name = name;
  built.versions = {};

  async.eachLimit(versions, this.limit, (pkg, next) => {
    if (!pkg.dist.tarball) {
      debug('bad package version  %s@%d', name, pkg.version);
      return next();
    }
    //
    // Use baltar to put the package into place on disk untarred and all that
    //
    var fullPath = path.join(this.dir, name, pkg.version)
    baltar.pull({
      url: pkg.dist.tarball,
      path: fullPath
    }, (err, entries) => {
      if (err) return next(err);
      //
      // We append package to the path because that is the folder that it
      // `untars` into that will be within the version number folder
      //
      built.versions[pkg.version] = path.join(fullPath, 'package');
      next();
    });
  }, err => {
    callback(err, built);
  });
};

function tryParse(data) {
  var json;

  try {
    json = JSON.parse(data);
  } catch (ex) {}

  return json;
}
