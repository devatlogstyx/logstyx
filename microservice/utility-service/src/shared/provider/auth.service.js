//@ts-check

const { FIND_USER_BY_ID_WSROUTE, CAN_USER_DO_WSROUTE } = require("common/routes/rpc-websockets")

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

/**
 * 
 * @param {string} id 
 * @returns 
 */
exports.findUserById = (id) => ws.createCall(FIND_USER_BY_ID_WSROUTE, { id })

/**
 * 
 * @param {*} userId 
 * @param {*} access 
 * @returns 
 */
exports.canUserDo = (userId, access) => ws.createCall(CAN_USER_DO_WSROUTE, { userId, access })