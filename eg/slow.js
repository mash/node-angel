var http = require("http")
,   url  = require("url")
;

var server = http.Server(function(req, res) {
    var request_id = url.parse(req.url,true).query.request_id;
    log( "received: " + request_id );
    res.writeHead(200);
    setTimeout( function () {
        res.end( "worker["+process.pid+"] "+ request_id );
        log( "finished: " + request_id );
    }, 1000 );
});
module.exports = server;

function log (message) {
    console.log( "worker["+process.pid+"] "+message );
}
