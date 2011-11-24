var http = require('http');
var body = process.env.NODE_ANGEL_TEST_MESSAGE;
var server = http.Server(function(req, res) {
    res.writeHead(200);
    res.write( body + ":" + process.pid );
    res.end();
});
module.exports = server;
