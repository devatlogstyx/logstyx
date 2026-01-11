//@ts-check

const { CACHE_READ_WSROUTE } = require("common/routes/rpc-websockets")

const { useRPCWebsocket } = require("common/hooks");
let WebSocket = require("jsonrpc-ws").Client;

// @ts-ignore
const { client } = useRPCWebsocket({
    Client: WebSocket,
});

const ws = client(process.env.CACHE_WSHOST);

ws.on("open", () => console.log("WebSocket to cache service connected"));
ws.on("error", () => console.error("WebSocket to cache service error"));
ws.on("close", () => console.error("WebSocket to cache service closed"));

/**
 * 
 * @param {object} param0 
 * @param {string} param0.key
 * @param {string} param0.id
 * @returns 
 */
exports.readCache = ({ key, id }) => ws.createCall(CACHE_READ_WSROUTE, { key, id });