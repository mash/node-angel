var fs  = require('fs'),
assert  = require('assert'),
http    = require('http'),
cluster = require('cluster'),
angel   = require('../angel'),
app     = require('./_app.js');

// this will be our test app's response body
var expected_body = process.env.NODE_ANGEL_TEST_MESSAGE = "Hello";

angel( app, {
    port                   : 0, // listen whereever available
    workers                : 1,
    refresh_modules_regexp : "/_app\\.js$"
} );

function sendRequest( port, callback ) {
    http.get({
        host: 'localhost',
        port: port,
        path: '/'
    }, function(res) {
        var body = '';
        res.on('data', function(chunk) {
            body += chunk;
        });
        res.on('end', function() {
            callback( body );
        });
    });
}

function runTest (port) {
    sendRequest( port, function(body) {
        var body_and_pid = body.split(':')
        , worker_pid     = body_and_pid[ 1 ]
        ;
        // console.log("body_and_pid: ",body_and_pid);

        assert( body_and_pid[ 0 ] === expected_body, 'response body ok' );
        assert( worker_pid !== process.pid, 'angel pid and worker pid is different' );

        expected_body = process.env.NODE_ANGEL_TEST_MESSAGE = "World";

        // trigger graceful restart
        process.kill( process.pid, 'SIGHUP' );

        // wait til worker restarts
        setTimeout( function() {
            sendRequest( port, function(body2) {
                var body_and_pid2 = body2.split(':');
                // console.log( "body_and_pid2[ 0 ]: ",body_and_pid2);

                assert( body_and_pid2[ 0 ] === expected_body, 'response body ok after module refreshed' );
                assert( body_and_pid2[ 1 ] !== worker_pid, 'worker pid changed' );
                assert( body_and_pid2[ 1 ] !== process.pid, 'respawned worker pid is not same as angel' );

                console.log( 'Result: PASS' );

                process.exit(0);
            });
        }, 1100 );
    });
}

// worker tells master where the worker is listening on
// master uses that port to request
if ( cluster.isMaster ) {
    Object.keys(cluster.workers).forEach( function(id) {
        cluster.workers[id].on("message", function(m) {
            switch (m.cmd) {
            case "listening":
                runTest( m.address.port );
                break;
            }
        });
    });
}
