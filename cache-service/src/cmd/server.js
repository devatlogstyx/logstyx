//@ts-check

require("dotenv").config()
const { Server } = require("jsonrpc-ws");
const { num2Floor } = require("common/function");
const http = require('http');
const { useRPCWebsocket } = require("common/hooks");
const { logger } = require("../shared/logger");

const port = num2Floor(process.env.PORT, 1023);
// Create the server
const server = http.createServer((req, res) => {
    if (req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('OK');
    } else {
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Hello, World!\n');
    }
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', console.error);
server.on('listening', () => console.log("server up", port));

// @ts-ignore
const { server: rpc } = useRPCWebsocket({
    Server,
    Log: logger
});

require("./rpc-websockets").init(rpc({ server, path: "/rpc" }));

require("./mq.queue")