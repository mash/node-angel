var angel = require('..')
, app     = require('./app')
, fs      = require('fs')
, oldmask
, newmask = 0
, socket  = "/var/tmp/angel.eg.socket"
, cluster = require('cluster')
;

// run
// $ node eg/server.unix.js

if ( cluster.isMaster ) {
    oldmask = process.umask(newmask);
    console.log('Changed umask from: ' + oldmask.toString(8) + ' to ' + newmask.toString(8));
}

if ( fs.existsSync( socket ) ) {
    fs.unlinkSync( socket );
}

angel( app, {
    path                   : socket,
    workers                : 4,
    pidfile                : 'angel.pid',
    refresh_modules_regexp : 'eg/app\\.js$', // match agains require.cache keys
    max_requests_per_child : 2
});
