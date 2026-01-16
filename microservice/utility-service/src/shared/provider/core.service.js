//@ts-check

const { CREATE_LOG_WSROUTE, FIND_PROJECT_BY_ID_WSROUTE, PAGINATE_PROJECT_WSROUTE } = require("common/routes/rpc-websockets")

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
const createLog = (params) => ws.createCall(CREATE_LOG_WSROUTE, params);

/**
 * 
 * @param {string} projectId 
 * @returns 
 */
const findProjectById = (projectId) => ws.createCall(FIND_PROJECT_BY_ID_WSROUTE, { projectId });

/**
 * 
 * @param {*} query 
 * @param {string} sortBy 
 * @param {number} limit 
 * @param {number} page 
 * @returns 
 */
const paginateProject = (query, sortBy, limit, page) => ws.createCall(PAGINATE_PROJECT_WSROUTE, { query, sortBy, limit, page });

/**
 * 
 * @param {*} query 
 * @returns 
 */
const listAllProject = async (query) => {
    const firstPage = await this.paginateProject(query, "createdAt:desc", 10, 1);

    if (!firstPage?.results) {
        return [];
    }

    const res = [...firstPage.results];
    const totalPages = firstPage.totalPages || 1;

    // Fetch remaining pages in parallel
    if (totalPages > 1) {
        const pagePromises = [];
        for (let page = 2; page <= totalPages; page++) {
            pagePromises.push(
                this.paginateProject(query, "createdAt:desc", 10, page)
            );
        }

        const remainingPages = await Promise.all(pagePromises);
        remainingPages.forEach(pageData => {
            if (pageData?.results?.length) {
                res.push(...pageData.results);
            }
        });
    }

    return res;
}

module.exports = {
    createLog,
    findProjectById,
    paginateProject,
    listAllProject
}