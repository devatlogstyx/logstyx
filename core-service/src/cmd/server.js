//@ts-check

require("dotenv").config()
const { connectToDB } = require("../shared/mongoose/index.js");
const { logger } = require("../shared/logger/index.js");
const { Server } = require("jsonrpc-ws");
const { useRPCWebsocket } = require("common/hooks");


(async () => {
    await connectToDB();
    const { seedUser } = require("../internal/service/user.js");
    const { num2Floor } = require("common/function")
    const app = require("../shared/express/app.js");
    const http = require('http');

    /**
     * Get port from environment and store in Express.
     */

    const port = num2Floor(process.env.PORT, 1023);
    app.set('port', port);

    /**
     * Create HTTP server.
     */

    const server = http.createServer(app);

    /**
     * Listen on provided port, on all network interfaces.
     */

    server.listen(port);
    server.on('error', logger.error);
    server.on('listening', () => console.log("server up", port));

    seedUser().catch(console.error)

    // @ts-ignore
    const { server: rpc } = useRPCWebsocket({
        Server,
        Log: logger
    });

    require("./rpc-websockets.js").init(rpc({ port: process?.env?.PORT, path: "/rpc" }));
})();
