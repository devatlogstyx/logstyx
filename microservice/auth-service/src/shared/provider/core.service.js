//@ts-check

const {
    CREATE_LOG_WSROUTE,
    GET_USER_DASHBOARD_PROJECT_STATS_WSROUTE,
    LIST_USER_PROJECT_WSROUTE
} = require("common/routes/rpc-websockets")

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
/**
 * 
 * @param {string} userId 
 * @returns 
 */
exports.getUserDashboardProjectStats = (userId) => ws.createCall(GET_USER_DASHBOARD_PROJECT_STATS_WSROUTE, { userId });

/**
 * 
 * @param {string} userId 
 * @returns 
 */
exports.listUsersProject = (userId) => ws.createCall(LIST_USER_PROJECT_WSROUTE, { userId })