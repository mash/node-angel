var fs     = require("fs")
, path     = require("path")
, cluster  = require("cluster")
, numCPUs  = require("os").cpus().length
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
    var reloading_modules = []
    ,   ret = true;
    Object.keys( require.cache ).map( function(cache_keys) {
        if ( cache_keys.match( regexp ) ) {
            reloading_modules.push( cache_keys );
        }
    });

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
function spawnWorker (options) {
    var new_worker            = cluster.fork();
    new_worker.angelOptions   = options;
    if ( ! new_worker.pid ) {
        new_worker.pid        = new_worker.process.pid;
    }

    log( "forked worker["+new_worker.pid+"]" );

    new_worker.on( "message", function (m) {
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
function onWorkerDeath (worker, workers) {
    if ( worker.is_gracefully_dying ) {
        log( "worker[" + worker.pid + "] died gracefully" );
    }
    else {
        if ( worker.overMaxRequests ) {
            log( "worker[" + worker.pid + "] processed " + worker.angelOptions.max_requests_per_child + " requests and died successfully" );
        }
        else {
            // accidental death
            log( "worker[" + worker.pid + "] died unexpectedly, restarting" );
        }
        var new_worker            = spawnWorker( worker.angelOptions );
        workers[ new_worker.pid ] = new_worker;
    }
    delete workers[ worker.pid ];
}
function startServer (server, options) {
    var workers      = {}
    ,   i            = 0
    ,   requestCount = 0
    ,   listenArgs   = []
    ,   new_worker
    ;

    if ( cluster.isMaster ) {

        // defaults to angel.pid
        createPIDFile( options.pidfile );

        process.on( "SIGINT", function() {
            log( "SIGINT" );
            process.exit( 0 ); // run exit event listener
        });
        process.on( "SIGTERM", function() {
            // graceful shutdown
            log( "SIGTERM" );

            eachWorkers( workers, function(worker) {
                worker.is_gracefully_dying = 1;
                worker.send({ cmd: "close" });
            });
            // cluster master to stop listening on TCP sockets
            cluster.disconnect();
        });
        process.on( "SIGHUP", function() {
            // graceful restart
            log( "SIGHUP" );

            var willrestart = true;
            if ( options.refresh_modules_regexp ) {
                willrestart = reloadModules( options.refresh_modules_regexp );
            }

            if ( willrestart ) {
                // graceful restart
                eachWorkers( workers, function(worker) {
                    var new_worker            = spawnWorker( options );
                    workers[ new_worker.pid ] = new_worker;

                    worker.is_gracefully_dying = 1;
                    setTimeout( function() {
                        worker.send({ cmd: "close" });
                        worker.disconnect();
                    }, options.interval * 1000 );
                });
            }
            else {
                log( "reloading modules failed, wont run graceful restart" );
            }
        });
        process.on( "exit", function() {
            log( "master will exit" );

            deletePIDFile( options.pidfile );

            eachWorkers( workers, function(worker) {
                worker.destroy();
            });
        });

        log( "master will fork "+options.workers+" workers" );

        cluster.on( "exit",  function (worker) {
            onWorkerDeath( worker, workers );
        });

        for (i=0; i<options.workers; i+=1 ) {
            new_worker                = spawnWorker( options );
            workers[ new_worker.pid ] = new_worker;
        }
    }
    else {
        log( "launched" );

        server.on( "close", function() {
            log( "closed" );
            process.exit(0);
        });
        server.on( "request", function () {
            requestCount += 1;
            if ( options.max_requests_per_child && (requestCount >= options.max_requests_per_child) ) {
                process.send({ cmd: "set", key: "overMaxRequests", value: 1 });
                if ( ! server.isClosed ) {
                    server.isClosed = 1;
                    server.close();
                }
            }
        });
        if ( options.port ) {
            listenArgs.push( options.port );
            if ( options.host ) {
                listenArgs.push( options.host );
            }
        }
        else if ( options.path ) {
            listenArgs.push( options.path );
        }
        server.isListening = false;
        listenArgs.push( function() {
            server.isListening = true;
            log( "listening on "+ ( (typeof options.port !== "undefined") ? server.address().port
                                                                          : options.path ) );

            // tell master where we're listening (used in tests)
            process.send({ cmd: "listening", address: server.address() });
        });

        server.listen.apply( server, listenArgs );

        process.on( "message", function(m) {
            switch (m.cmd) {
            case "close":
                if (server.isListening) {
                    log( "will close" );
                    server.close();
                }
                else {
                    server.emit("close");
                }
                break;
            default:
                // log( "worker["+process.pid+"] unsupported message: ",m);
                break;
            }
        });
    }
}

function validate (options, app, callback) {
    var ok = true, messages = [];
    if ( (typeof(options.port) === "undefined") &&
         (typeof(options.path) === "undefined") ) {
        messages.push("Provide port or path");
        ok = false;
    }
    else if ( (typeof(options.port) !== "undefined") &&
              (typeof(options.port) !== "number") ) {
        messages.push("Port is invalid: "+options.port);
        ok = false;
    }
    try {
        require( path.resolve(app) );
    } catch (e) {
        messages.push("Invalid app.js:" , e);
        ok = false;
    }
    callback( ok, messages );
}

function angel (server, options_) {
    if ( (typeof options_.port === "undefined") &&
         (typeof options_.path === "undefined") ) {
        throw "angel requires port or path option";
    }

    var options = {
        workers                : numCPUs,
        pidfile                : "angel.pid",
        refresh_modules_regexp : false,
        interval               : 1,
        max_requests_per_child : 0
    };

    // merge options_ into default options
    Object.keys( options_ ).map( function(key) {
        options[ key ] = options_[ key ];
    });

    startServer( server, options );
}
angel.validate = validate;

module.exports = angel;
