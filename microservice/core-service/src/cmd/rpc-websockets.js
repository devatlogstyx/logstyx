// @ts-check

const {
    CREATE_LOG_WSROUTE,
    GET_USER_PROJECT_STATS_WSROUTE,
    LIST_USER_PROJECT_WSROUTE,
    FIND_PROJECT_BY_ID_WSROUTE,
    PAGINATE_PROJECT_WSROUTE,
    PAGINATE_BUCKET_WSROUTE,
    FIND_BUCKET_BY_ID_WSROUTE,
    LIST_USER_BUCKET_WSROUTE,
    GET_USER_BUCKET_STATS_WSROUTE
} = require("common/routes/rpc-websockets");
const { processCreateSelfLog, getLogModel } = require("../internal/service/logger");
const { findProjectById, paginateProject, listUserProject, getUsersProjectsStats } = require("../internal/service/project");
const { paginateBucket, listUserBucket, getUsersBucketStats } = require("../internal/service/bucket");
const { getBucketFromCache } = require("../shared/cache");

/**
 * 
 * @param {*} rpc 
 */
exports.init = (rpc) => {

    rpc.use(CREATE_LOG_WSROUTE, async (/** @type {{ device: object; context: object; data: object; level: string; timestamp: string | number | Date; }} */ params) => {
        return processCreateSelfLog(params)
    });
    // @ts-ignore
    rpc.use(GET_USER_PROJECT_STATS_WSROUTE, async ({ userId }) => {
        return getUsersProjectsStats(userId, getLogModel)
    });

    rpc.use(GET_USER_BUCKET_STATS_WSROUTE, async ({ userId }) => {
        return getUsersBucketStats(userId, getLogModel)
    });

    rpc.use(LIST_USER_PROJECT_WSROUTE, async ({ userId }) => {
        return listUserProject(userId)
    });

    rpc.use(LIST_USER_BUCKET_WSROUTE, async ({ userId }) => {
        return listUserBucket(userId)
    });

    rpc.use(FIND_PROJECT_BY_ID_WSROUTE, async ({ projectId }) => {
        return findProjectById(projectId)
    });

    rpc.use(PAGINATE_PROJECT_WSROUTE, async ({ query, sortBy, limit, page }) => {
        return paginateProject(query, sortBy, limit, page)
    });

    rpc.use(FIND_BUCKET_BY_ID_WSROUTE, async ({ bucketId }) => {
        return getBucketFromCache(bucketId)
    });

    rpc.use(PAGINATE_BUCKET_WSROUTE, async ({ query, sortBy, limit, page }) => {
        return paginateBucket(query, sortBy, limit, page)
    });
};
