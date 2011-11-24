# angel.js

angel.js is a simple library to gracefully restart multi process net.Servers on node >= 0.6
be careful, beta quality yet


## Features

 * SIGHUP and graceful restart


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
    port: 3000,
    workers: 4,
    pidfile: 'angel.pid',
    refresh_modules_regexp: 'eg/app\\.js$' // match agains require.cache keys
});
```

will output something like:

```bash
athens% node server.js
master[3367] created pid_file: angel.pid
master[3367] master will fork 4 workers
master[3367] forked worker[3368]
master[3367] forked worker[3369]
master[3367] forked worker[3370]
master[3367] forked worker[3371]
worker[3368] launched
worker[3368] listening on 3000
worker[3371] launched
worker[3370] launched
worker[3371] listening on 3000
worker[3370] listening on 3000
worker[3369] launched
worker[3369] listening on 3000
```

to graceful restart:

```bash
kill -HUP `cat angel.pid`
```

after HUP you'll have stdout:

```bash
master[6304] SIGHUP
master[6304] reloaded /path/to/eg/app.js
worker[6305] closes
master[6304] forked worker[6311]
worker[6306] closes
master[6304] forked worker[6312]
worker[6307] closes
master[6304] forked worker[6313]
worker[6308] closes
master[6304] forked worker[6314]
master[6304] worker 6308 died
master[6304] worker 6307 died
master[6304] worker 6306 died
master[6304] worker 6305 died
worker[6311] launched
worker[6311] listening on 3000
worker[6314] launched
worker[6312] launched
worker[6314] listening on 3000
worker[6312] listening on 3000
worker[6313] launched
worker[6313] listening on 3000
```

## TODO

 * limit max requests per process and suicide worker
 * merge pull requests :-)


## License

MIT License
