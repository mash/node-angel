var http = require('http');

var requests = 0;
var server = http.Server(function(req, res) {
    res.writeHead(200);
    res.end( "worker["+process.pid+"] "+ (++requests) );
});
module.exports = server;
