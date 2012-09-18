var fs     = require('fs')
, cluster  = require('cluster')
, numCPUs  = require('os').cpus().length
;

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
// returns true on success, false when require fails
function reloadModules (regexp) {
    var reloading_modules = [];
    Object.keys( require.cache ).map( function(cache_keys) {
        if ( cache_keys.match( regexp ) ) {
            reloading_modules.push( cache_keys );
        }
    });
    var ret = true;

    // delete all matched modules from cache at once
    // and load them afterwards for consistency
    reloading_modules.forEach( function(reloading_module) {
        delete require.cache[ reloading_module ];
    });
    reloading_modules.forEach( function(reloading_module) {
        try {
            require( reloading_module );
            log( "reloaded " + reloading_module );
        } catch (e) {
            log( "reloading: " + reloading_module + " failed error: ", e );
            ret = false;
        }
    });
    return ret;
}
function spawnWorker (workers) {
    var new_worker = cluster.fork();
    workers[ new_worker.pid ] = new_worker;

    log( "forked worker["+new_worker.pid+"]" );

    new_worker.on( 'message', function (m) {
        switch (m.cmd) {
        case "set":
            new_worker[ m.key ] = m.value;
            break;
        default:
            break;
        }
    });
    return new_worker;
}
function startServer (server, options) {
    if ( cluster.isMaster ) {
        var workers   = {};

        // defaults to angel.pid
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

            var willrestart = true;
            if ( options.refresh_modules_regexp ) {
                willrestart = reloadModules( options.refresh_modules_regexp );
            }

            if ( willrestart ) {
                // graceful restart
                eachWorkers( workers, function(worker) {
                    var new_worker = spawnWorker( workers );

                    worker.is_rising = 1; // going to die gracefully
                    setTimeout( function() {
                        worker.send({ cmd: 'close' });
                    }, options.interval * 1000 );
                });
            }
            else {
                log( "reloading modules failed, wont run graceful restart" );
            }
        });
        process.on( 'exit', function() {
            log( "master will exit" );

            deletePIDFile( options.pidfile );

            eachWorkers( workers, function(worker) {
                worker.kill();
            });
        });

        log( "master will fork "+options.workers+" workers" );

        cluster.on( 'death', function(worker) {
            if ( worker.is_rising ) {
                // graceful restart killed worker
                log( 'worker[' + worker.pid + '] died' );
            }
            else {
                if ( worker.overMaxRequests ) {
                    log( 'worker[' + worker.pid + '] processed ' + options.max_requests_per_child + ' requests and died successfully' );
                }
                else {
                    // accidental death
                    log( 'worker[' + worker.pid + '] died unexpectedly, restarting' );
                }
                spawnWorker( workers );
            }
            delete workers[ worker.pid ];
        });

        var i;
        for (i=0; i<options.workers; i++ ) {
            spawnWorker( workers );
        }
    }
    else {
        log( "launched" );

        server.on( 'close', function() {
            log( "closes" );
            process.exit(0);
        });
        var requestCount = 0;
        server.on( 'request', function () {
            requestCount ++;
            if ( options.max_requests_per_child && (requestCount >= options.max_requests_per_child) ) {
                process.send({ cmd: 'set', key: "overMaxRequests", value: 1 });
                server.close();
            }
        });
        server.listen( options.port, function() {
            log( "listening on "+server.address().port );
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

function angel (server, options_) {

    var options = {
        port: 3000,
        workers: numCPUs,
        pidfile: 'angel.pid',
        refresh_modules_regexp: false,
        interval: 1,
        max_requests_per_child: 0
    };

    // merge options_ into default options
    Object.keys( options_ ).map( function(key) {
        options[ key ] = options_[ key ];
    });

    startServer( server, options );
}

module.exports = angel;
