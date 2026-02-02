//@ts-check

const { PROJECT_CACHE_KEY, PROBE_CACHE_KEY, WIDGET_DATA_CACHE_KEY, WIDGET_CACHE_KEY, REPORT_CACHE_KEY, ALLOWED_ORIGIN_CACHE_KEY, BUCKET_CACHE_KEY } = require("common/constant")

const { submitCreateCache } = require("../provider/mq-producer")

const { readCache } = require("../provider/cache.service")
const { useCache } = require("common/hooks")

const { logger: Log } = require("../logger")
const projectModel = require("../../internal/model/project.model")
const probeModel = require("../../internal/model/probe.model")

const widgetModel = require("../../internal/model/widget.model")
const reportModel = require("../../internal/model/report.model")
const bucketModel = require("../../internal/model/bucket.model")

const { updateCache, getCache } = useCache({
    ReadCache: readCache,
    SubmitCache: submitCreateCache,
    Log
})

const updateBucketCache = async (id) => updateCache(BUCKET_CACHE_KEY, id, bucketModel)
const getBucketFromCache = async (id) => getCache(BUCKET_CACHE_KEY, id, bucketModel)

const updateProjectCache = async (id) => updateCache(PROJECT_CACHE_KEY, id, projectModel)
const getProjectFromCache = async (id) => getCache(PROJECT_CACHE_KEY, id, projectModel)

const updateProbeCache = async (id) => updateCache(PROBE_CACHE_KEY, id, probeModel)
const getProbeFromCache = async (id) => getCache(PROBE_CACHE_KEY, id, probeModel)


const updateWidgetCache = async (id) => updateCache(WIDGET_CACHE_KEY, id, widgetModel)
const getWidgetFromCache = async (id) => getCache(WIDGET_CACHE_KEY, id, widgetModel)


const updateReportCache = async (id) => updateCache(REPORT_CACHE_KEY, id, reportModel)
const getReportFromCache = async (id) => getCache(REPORT_CACHE_KEY, id, reportModel)


/**
 * 
 * @param {*} id 
 * @param {*} data 
 * @returns 
 */
const updateWidgetDataCache = async (id, data) => {
    submitCreateCache({
        id,
        key: WIDGET_DATA_CACHE_KEY,
        data,
        ttl: 60 // 1 minute
    })

    return data
}

const getWidgetDataCache = async (id) => {
    let res = await readCache({ key: WIDGET_DATA_CACHE_KEY, id });
    if (res) {
        return res;
    }

    return null
}

const updateAllowedOriginCache = async () => {
    const list = await projectModel.distinct("settings.allowedOrigin");
    const origin = (list || []).filter(item => typeof item === 'string' && item.length > 0);

    submitCreateCache({
        id: "cache",
        key: ALLOWED_ORIGIN_CACHE_KEY,
        data: origin,
    })

    return origin
}

const getAllowedOriginFromCache = async () => {
    let res = await readCache({ key: WIDGET_DATA_CACHE_KEY, id: "cache" });
    if (res) {
        return res;
    }

    return updateAllowedOriginCache()
}

module.exports = {
    updateBucketCache,
    getBucketFromCache,

    updateProjectCache,
    getProjectFromCache,

    updateProbeCache,
    getProbeFromCache,

    updateWidgetCache,
    getWidgetFromCache,

    updateReportCache,
    getReportFromCache,

    updateWidgetDataCache,
    getWidgetDataCache,

    updateAllowedOriginCache,
    getAllowedOriginFromCache,
}