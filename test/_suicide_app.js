var http = require('http');
var body = process.env.NODE_ANGEL_TEST_MESSAGE;
var server = http.createServer(function(req, res) {
    res.writeHead(200);
    res.end( body + ":" + process.pid );
});
server.on( 'listening', function() {
    // console.log( "suicide app is listening" );
    setTimeout( function() {
        // console.log( "suicide app dies" );
        throw("testing worker accidental death");
    }, 300 );
});
module.exports = server;
