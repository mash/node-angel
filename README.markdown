# angel.js

angel.js is a simple library to gracefully restart multi process net.Servers on node >= 0.6
be careful, beta quality yet


## Features

 * SIGHUP and graceful restart


## Example

app.js:

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

server.js:

```javascript
var angel = require('./angel')
, app     = require('./app');

angel( app, {
    port: 3000,
    workers: 4,
    pidfile: 'angel.pid'
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
worker[3368] worker[3368] launched
worker[3368] worker[3368] listening on 3000
worker[3371] worker[3371] launched
worker[3370] worker[3370] launched
worker[3371] worker[3371] listening on 3000
worker[3370] worker[3370] listening on 3000
worker[3369] worker[3369] launched
worker[3369] worker[3369] listening on 3000
```

to graceful restart:

```bash
kill -HUP `cat angel.pid`
```


## TODO

 * clean require.cache before respawn
 * limit max requests per process and suicide worker
 * merge pull requests :-)


## License

MIT License
