var request = require("request")
,   es      = require("event-stream")
,   l       = require("nlogger").logger(module)
,   http    = require("http")
;

http.globalAgent.maxSockets = 1000;

var request_id = 0;
es.readable(
    function makeRequest(count,callback) {
        setTimeout( function () {
            request_id ++;
            callback( null, {
                url    : "http://localhost:8010/?request_id="+request_id,
                method : "POST"
            });
        }, 100 );
    }
)
    .pipe( es.map( function (data, callback) {
        var started = new Date();
        request( data, function (err, response, body) {
            var ended   = new Date();
            var elapsed = (ended - started);
            if (err) {
                l.error( err );
            }
            callback( null, {
                error      : err,
                request    : data,
                statusCode : response ? response.statusCode : null,
                headers    : response ? response.headers : null,
                body       : body,
                elapsed    : elapsed,
                started    : started,
                ended      : ended
            });
        });
    }) )
    .pipe( es.map( function (data, callback) {
        callback( null, { statusCode: data.statusCode, body: data.body } );
    }) )
    .pipe( es.stringify(false) )
    .pipe( process.stdout )
;
