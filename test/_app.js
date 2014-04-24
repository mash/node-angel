var http = require('http');
var body = process.env.NODE_ANGEL_TEST_MESSAGE;
var server = http.createServer(function(req, res) {
    res.writeHead(200);
    res.end(body + ":" + process.pid);
});
module.exports = server;
