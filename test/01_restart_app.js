var fs  = require('fs'),
assert  = require('assert'),
http    = require('http'),
cluster = require('cluster'),
angel   = require('../angel'),
app     = require('./_app.js');

// this will be our test app's response body
var expected_body = process.env.NODE_ANGEL_TEST_MESSAGE = "Hello";

var test_port = 3000;

angel( app, {
    port: test_port, // mmm, test requires port 3000 to be open
    workers: 1,
    refresh_modules_regexp: "/_app\\.js$"
} );

function sendRequest( callback ) {
    http.get({
        host: 'localhost',
        port: test_port,
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

function runTest () {
    sendRequest( function(body) {
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
            sendRequest( function(body2) {
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

if ( cluster.isMaster ) {
    // wait til listening
    setTimeout( runTest, 100 );
}
