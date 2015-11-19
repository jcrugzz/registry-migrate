'use strict';

var path = require('path');
var os = require('os');
var rimraf = require('rimraf');
var once = require('one-time');
var Modify = require('./modify');
var Fetch = require('./fetch');
var Insert = require('./insert');
var pumpify = require('pumpify');
var uuid = require('uuid');
var conc = require('concurrent-writable');
var Readable = require('readable-stream/readable');

var migrate = module.exports = function (options, callback) {
  var source = options.source;
  var dest = options.destination;
  var limit = options.limit || 10;
  var packages = options.packages;
  var dir = options.dir || path.join(os.tmpdir(), uuid());
  var clean = options.clean === false ? false : true;
  var fn = once(cleanup);

  //
  // Create our pipe chain of things to do
  //
  var dup = pumpify.obj(
    new Fetch(source, { limit: limit, dir: dir }),
    new Modify({ limit: limit }),
    conc(new Insert(options), limit)
  )
  .once('error', fn)
  .once('finish', fn);

  if (Array.isArray(packages)) {
    toReadable(packages).pipe(dup);
  }

  return dup;

  function cleanup () {
    var args = Array.prototype.slice.call(arguments);
    if (!clean) return callback && callback.apply(null, args);

    //
    // Best effort cleanup
    //
    rimraf(dir, function () {
      callback && callback.apply(null, args);
    });
  }
};

module.exports.toReadable = toReadable;
/**
 * Turn an array of strings into a stream of objects
 */
function toReadable(arr) {
  var read = new Readable({
    objectMode: true,
    read: function () {}
  });

  //
  // TODO: Supoort this being a fully fledged NPM object in case they are
  // pre-fetched
  //
  for(var i = 0; i < arr.length; i++) {
    read.push({ name: arr[i] });
  }

  read.push(null);

  return read;
}

