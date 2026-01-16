// @ts-check

const {
    CREATE_LOG_WSROUTE,
    GET_USER_DASHBOARD_PROJECT_STATS_WSROUTE,
    LIST_USER_PROJECT_WSROUTE,
    FIND_PROJECT_BY_ID_WSROUTE,
    PAGINATE_PROJECT_WSROUTE
} = require("common/routes/rpc-websockets");
const { processCreateSelfLog, getLogModel } = require("../internal/service/logger");
const { getUsersDashboardProjectsStats, findProjectById, paginateProject } = require("../internal/service/project");

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
        return getUsersDashboardProjectsStats(userId, getLogModel)
    });

    rpc.use(LIST_USER_PROJECT_WSROUTE, async ({ userId }) => {
        return getUsersDashboardProjectsStats(userId, getLogModel)
    });

    rpc.use(FIND_PROJECT_BY_ID_WSROUTE, async ({ projectId }) => {
        return findProjectById(projectId)
    });

    rpc.use(PAGINATE_PROJECT_WSROUTE, async ({ query, sortBy, limit, page }) => {
        return paginateProject(query, sortBy, limit, page)
    });
};
