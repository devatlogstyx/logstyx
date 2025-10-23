//@ts-check

const { FIND_USER_BY_ID_WSROUTE } = require("common/routes/rpc-websockets")

const { useRPCWebsocket } = require("common/hooks");
let WebSocket = require("jsonrpc-ws").Client;

// @ts-ignore
const { client } = useRPCWebsocket({
    Client: WebSocket,
});

const ws = client(process.env.AUTH_WSHOST);

ws.on("open", () => console.log("WebSocket to auth service connected"));
ws.on("error", () => console.error("WebSocket to auth service error"));
ws.on("close", () => console.error("WebSocket to auth service closed"));

exports.findUserById = ws.createCall(FIND_USER_BY_ID_WSROUTE);