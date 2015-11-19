# registry-migrate

WIP

Migrate a set of packages into a target registry

```js
var migrate = require('registry-migration');

migrate({
  source: source,
  destination: destination,
  // Set of packages to migrate, could be strings or full package documents
  packages: ['hyperquest', 'changes-stream'] 
}, function (err) {

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
  
  });
  
```
