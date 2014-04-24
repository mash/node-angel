var angel = require('..')
, app     = require('./app');

// run
// $ node eg/server.js

angel( app, {
    port: 3000,
    workers: 4,
    pidfile: 'angel.pid',
    refresh_modules_regexp: 'eg/app\\.js$', // match agains require.cache keys
    max_requests_per_child: 2
});
