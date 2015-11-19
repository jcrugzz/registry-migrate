# registry-migrate

[![build
status](https://secure.travis-ci.org/jcrugzz/registry-migrate.svg)](http://travis-ci.org/jcrugzz/registry-migrate)

Migrate a set of packages from a source registry into a target registry.

## Install

```sh
npm install registry-migrate --save
```

## Example

```js
var migrate = require('registry-migration');

migrate({
  source: source,
  destination: destination,
  // Set of packages to migrate, could be strings or full package documents
  packages: ['hyperquest', 'changes-stream'] 
}, function (err) {
  if (err) return console.error(err);
  console.log('Finished!');
});

//
// Also returns a duplex stream if we want to pipe in our own set of packages
//

packageStream(opts)
  .pipe(migrate({
    source: source,
    destination: destination
  }))
  .on('error', onError)
  .on('finish', function () {
    console.log('Finished!'); 
  });
  
```

## License
MIT
