// @ts-check

const {
    CREATE_LOG_WSROUTE,
    GET_USER_DASHBOARD_PROJECT_STATS_WSROUTE,
    LIST_USER_PROJECT_WSROUTE
} = require("common/routes/rpc-websockets");
const { processCreateSelfLog } = require("../internal/service/logger");
const { getUsersDashboardProjectsStats } = require("../internal/service/project");

/**
 * 
 * @param {*} rpc 
 */
exports.init = (rpc) => {

    rpc.use(CREATE_LOG_WSROUTE, async (/** @type {{ device: object; context: object; data: object; level: string; timestamp: string | number | Date; }} */ params) => {
        return processCreateSelfLog(params)
    });
    // @ts-ignore
    rpc.use(GET_USER_DASHBOARD_PROJECT_STATS_WSROUTE, async ({ userId }) => {
        return getUsersDashboardProjectsStats(userId)
    });

    rpc.use(LIST_USER_PROJECT_WSROUTE, async ({ userId }) => {
        return getUsersDashboardProjectsStats(userId)
    });

};
