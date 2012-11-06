var angel = require('../angel')
, app     = require('./app')
, oldmask
, newmask = 0
;

// run
// $ node eg/server.unix.js

oldmask = process.umask(newmask);
console.log('Changed umask from: ' + oldmask.toString(8) + ' to ' + newmask.toString(8));
app.on( 'listening', function () {
    process.umask(oldmask);
});

angel( app, {
    path: "/var/tmp/angel.eg.socket",
    workers: 4,
    pidfile: 'angel.pid',
    refresh_modules_regexp: 'eg/app\\.js$', // match agains require.cache keys
    max_requests_per_child: 2
});
