var fs  = require('fs'),
assert  = require('assert'),
http    = require('http'),
cluster = require('cluster'),
angel   = require('..'),
app     = require('./_suicide_app.js'),
test    = require('tap').test;

// this will be our test app's response body
var expected_body = process.env.NODE_ANGEL_TEST_MESSAGE = "Hello";

angel( app, {
    port                   : 0,
    workers                : 1,
    refresh_modules_regexp : "/_suicide_app\\.js$"
} );

function sendRequest( port, callback ) {
    var req = http.request({
        host: 'localhost',
        port: port,
        path: '/'
    }, function(res) {
        var body = '';
        res.on('data', function(chunk) {
            body += chunk;
        });
        res.on('end', function() {
            callback( res, body );
        });
    });
    req.setTimeout( 300, function() {
        assert( 0, "timeout, worker doesnt respond" );
        process.exit(0);
    });
    req.end();
}

function runTest (port) {
    test('rescues suicide', function (t) {
        t.plan(7);
        t.on('end', function () {
            process.kill( process.pid, 'SIGTERM' );
        });
        sendRequest( port, function(res, body) {
            t.equal( res.statusCode, 200 );

            var body_and_pid = body.split(':')
            ,   worker_pid   = body_and_pid[ 1 ]
            ;
            // console.log("body_and_pid: ",body_and_pid);

            t.equal( body_and_pid[ 0 ], expected_body, 'response body ok' );
            t.notEqual( worker_pid, process.pid, 'angel pid and worker pid is different' );

            expected_body = process.env.NODE_ANGEL_TEST_MESSAGE = "World";

            // wait til worker restarts after suicide
            setTimeout( function() {
                // console.log( "master requests app again" );
                sendRequest( port, function(res2, body2) {
                    t.equal( res2.statusCode, 200 );

                    var body_and_pid2 = body2.split(':');
                    // console.log( "body_and_pid2[ 0 ]: ",body_and_pid2);
                    
                    t.equal( body_and_pid2[ 0 ], expected_body, 'response body ok after module refreshed' );
                    t.notEqual( body_and_pid2[ 1 ], worker_pid,    'worker pid changed' );
                    t.notEqual( body_and_pid2[ 1 ], process.pid,   'respawned worker pid is not same as angel' );
                    t.end();
                });
            }, 300);
        });
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
