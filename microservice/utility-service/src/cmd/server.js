//@ts-check

require("dotenv").config()

const {
    useRPCWebsocket
} = require("common/hooks");
const { Server } = require("jsonrpc-ws");
const http = require('http');
const { logger } = require("../shared/logger");
const { num2Floor } = require("common/function");
const app = require("../shared/express/app.js");
const { connectToDB } = require("../shared/mongoose/index.js");

(async () => {

    await connectToDB();

    //@ts-ignore
    const { server: rpc } = useRPCWebsocket({
        Server,
        Log: logger
    });

    const port = num2Floor(process.env.PORT, 1023);
    // Create the server
    const server = http.createServer(app);

    /**
     * Listen on provided port, on all network interfaces.
     */

    server.listen(port);
    server.on('error', console.error);
    server.on('listening', () => console.log("server up", port));

    require("./rpc-websockets").init(rpc({ server, path: "/rpc" }));
    require("./mq.queue.js")
    require("./../internal/service/cron.js")
})()