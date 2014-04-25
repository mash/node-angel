var fs  = require('fs'),
assert  = require('assert'),
http    = require('http'),
cluster = require('cluster'),
async   = require('async'),
angel   = require('..'),
app     = require('./_app.js'),
test    = require('tap').test;

// this will be our test app's response body
var expected_body = process.env.NODE_ANGEL_TEST_MESSAGE = "Hello";

angel( app, {
    port                   : 0,
    workers                : 1,
    max_requests_per_child : 2,
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
    test('max_requests_per_child', function (t) {
        var jobs = []
          , requests_count = 10;

        t.plan(2);
        t.on('end', function () {
            process.kill( process.pid, 'SIGTERM' );
        });

        while ( requests_count -- ) {
            jobs.push( function(callback) {
                sendRequest( port, function(body) {
                    callback( null, body );
                });
            });
        }
        async.series( jobs, function (err, results) {
            t.ok( ! err, 'no errors' );
            
            var worker_pids = {};
            results.forEach( function( result ) {
                worker_pids[ result.split(/:/).pop() ] = 1;
            });
            t.equal( Object.keys( worker_pids ).length, 5,
                    '10 requests to 1 worker with 2 max_requests_per_child -> 5' );

            t.end();
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
