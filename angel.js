var fs     = require('fs')
, cluster  = require('cluster')
, numCPUs  = require('os').cpus().length
;

module.exports = angel;

function angel (server, options_) {

    var options = {
        port: 3000,
        workers: numCPUs,
        pidfile: 'angel.pid'
    };

    // merge options_ into default options
    Object.keys( options_ ).map( function(key) {
        options[ key ] = options_[ key ];
    });

    startServer( server, options );
}

function log() {
    var args = Array.prototype.slice.call(arguments);
    if ( cluster.isMaster ) {
        args.unshift( "master["+process.pid+"]" );
    }
    else {
        args.unshift( "worker["+process.pid+"]" );
    }
    console.log.apply( null, args );
}

function createPIDFile( file ) {
    fs.writeFileSync( file, process.pid + "\n" );
    log( "created pid_file: "+file );
}
function deletePIDFile( file ) {
    try {
        fs.unlinkSync( file );
    } catch (e) {
        log( e );
    }
}
function eachWorkers(workers, cb) {
    Object.keys( workers ).map (function(pid) {
        var worker = workers[ pid ];
        cb( worker );
    });
}
function startServer (server, options) {
    if ( cluster.isMaster ) {
        var workers   = {};

        // server_starter.pid
        createPIDFile( options.pidfile );

        process.on( 'SIGINT', function() {
            log( 'SIGINT' );
            process.exit( 0 ); // run exit event listener
        });
        process.on( 'SIGTERM', function() {
            log( 'SIGTERM' );
            process.exit( 0 ); // run exit event listener
        });
        process.on( 'SIGHUP', function() {
            log( 'SIGHUP' );

            // graceful restart
            eachWorkers( workers, function(worker) {
                worker.send({ cmd: 'close' });
                var worker = cluster.fork();
                workers[ worker.pid ] = worker;
                log( "forked worker["+worker.pid+"]" );
            });
        });
        process.on( 'exit', function() {
            log( "master will exit" );
            deletePIDFile( options.pidfile );
        });

        log( "master will fork "+options.workers+" workers" );

        cluster.on( 'death', function(worker) {
            log('worker ' + worker.pid + ' died');
            delete workers[ worker.pid ];
        });

        var i;
        for (i=0; i<options.workers; i++ ) {
            var worker = cluster.fork();
            workers[ worker.pid ] = worker;
            log( "forked worker["+worker.pid+"]" );
        }
    }
    else {
        log( "worker["+process.pid+"] launched" );

        server.on( 'close', function() {
            log( "worker["+process.pid+"] closes" );
            process.exit(0);
        });
        server.listen( options.port, function() {
            log( "worker["+process.pid+"] listening on "+options.port );
        });

        process.on( 'message', function(m) {
            switch (m.cmd) {
            case "close":
                server.close();
                break;
            default:
                // log( "worker["+process.pid+"] unsupported message: ",m);
                break;
            }
        });
    }
}
