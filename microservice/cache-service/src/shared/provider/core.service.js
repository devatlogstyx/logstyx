//@ts-check

const { CREATE_LOG_WSROUTE } = require("common/routes/rpc-websockets")

const { useRPCWebsocket } = require("common/hooks");
let WebSocket = require("jsonrpc-ws").Client;

// @ts-ignore
const { client } = useRPCWebsocket({
    Client: WebSocket,
});

const ws = client(process.env.CORE_WSHOST);

ws.on("open", () => console.log("WebSocket to core service connected"));
ws.on("error", () => console.error("WebSocket to core service error"));
ws.on("close", () => console.error("WebSocket to core service closed"));

/**
 * 
 * @param {*} params 
 * @returns 
 */
exports.createLog = (params) => ws.createCall(CREATE_LOG_WSROUTE, params);