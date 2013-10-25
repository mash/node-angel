# angel.js

angel.js is a simple library to gracefully restart multi process net.Servers

[![Build Status](https://travis-ci.org/mash/node-angel.png)](https://travis-ci.org/mash/node-angel)

## Features

 * SIGHUP and graceful restart
 * refresh modules, and graceful restart only if refresh succeeds
 * fork a new worker on accidental death
 * max_requests_per_child


## Example

eg/app.js:

```javascript
var http = require('http');

var server = http.Server(function(req, res) {
    res.writeHead(200);
    var tick = 0;
    setInterval( function() {
        res.write( "worker["+process.pid+"] "+ (++tick) +"\n" );
    }, 1000 );
});
module.exports = server;
```

eg/server.js:

```javascript
var angel = require('../angel')
, app     = require('./app');

angel( app, {
    port: 3000,                              // or unix domain socket. path: "/tmp/socket"
    workers: 4,
    pidfile: 'angel.pid',
    refresh_modules_regexp: 'eg/app\\.js$',  // match against require.cache keys
    interval: 1,                             // between new workers' start and old workers' close, in seconds
    max_requests_per_child: 1000             // worker dies and a new worker spawns after processing x number of requests
});
```

will output something like:

```bash
% node eg/server.js
master[20363] created pid_file: angel.pid
master[20363] master will fork 4 workers
master[20363] forked worker[20364]
master[20363] forked worker[20365]
master[20363] forked worker[20366]
master[20363] forked worker[20367]
worker[20365] launched
worker[20365] listening on 3000
worker[20364] launched
worker[20364] listening on 3000
worker[20366] launched
worker[20366] listening on 3000
worker[20367] launched
worker[20367] listening on 3000
```

to graceful restart:

```bash
kill -HUP `cat angel.pid`
```

after HUP you'll have stdout:

```bash
master[20363] SIGHUP
master[20363] reloaded /path/to/eg/app.js
master[20363] forked worker[20370]
master[20363] forked worker[20371]
master[20363] forked worker[20372]
master[20363] forked worker[20373]
worker[20372] launched
worker[20370] launched
worker[20372] listening on 3000
worker[20370] listening on 3000
worker[20371] launched
worker[20371] listening on 3000
worker[20373] launched
worker[20373] listening on 3000
worker[20364] closes
worker[20365] closes
master[20363] worker 20364 died
master[20363] worker 20365 died
worker[20366] closes
master[20363] worker 20366 died
worker[20367] closes
master[20363] worker 20367 died
```

## TODO

 * merge pull requests :-)


## License

MIT License
