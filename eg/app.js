var http = require('http');

var server = http.createServer(function(req, res) {
    res.writeHead(200);
    var tick = 0;
    setInterval( function() {
        res.write( "worker["+process.pid+"] "+ (++tick) +"\n" );
    }, 1000 );
});
module.exports = server;
