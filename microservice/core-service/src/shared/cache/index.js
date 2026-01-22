//@ts-check

const { PROJECT_CACHE_KEY, PROBE_CACHE_KEY, WIDGET_DATA_CACHE_KEY, WIDGET_CACHE_KEY, REPORT_CACHE_KEY, ALLOWED_ORIGIN_CACHE_KEY } = require("common/constant")

const { submitCreateCache } = require("../provider/mq-producer")

const { readCache } = require("../provider/cache.service")
const { useCache } = require("common/hooks")

const { logger: Log } = require("../logger")
const projectModel = require("../../internal/model/project.model")
const probeModel = require("../../internal/model/probe.model")
const { CACHE_CREATE_MQ_QUEUE } = require("common/routes/mq-queue")
const widgetModel = require("../../internal/model/widget.model")
const reportModel = require("../../internal/model/report.model")

const { updateCache, getCache } = useCache({
    ReadCache: readCache,
    SubmitCache: submitCreateCache,
    Log
})

exports.updateProjectCache = async (id) => updateCache(PROJECT_CACHE_KEY, id, projectModel)
exports.getProjectFromCache = async (id) => getCache(PROJECT_CACHE_KEY, id, projectModel)

exports.updateProbeCache = async (id) => updateCache(PROBE_CACHE_KEY, id, probeModel)
exports.getProbeFromCache = async (id) => getCache(PROBE_CACHE_KEY, id, probeModel)


exports.updateWidgetCache = async (id) => updateCache(WIDGET_CACHE_KEY, id, widgetModel)
exports.getWidgetFromCache = async (id) => getCache(WIDGET_CACHE_KEY, id, widgetModel)


exports.updateReportCache = async (id) => updateCache(REPORT_CACHE_KEY, id, reportModel)
exports.getReportFromCache = async (id) => getCache(REPORT_CACHE_KEY, id, reportModel)


/**
 * 
 * @param {*} id 
 * @param {*} data 
 * @returns 
 */
exports.updateWidgetDataCache = async (id, data) => {
    submitCreateCache({
        id,
        key: WIDGET_DATA_CACHE_KEY,
        data,
        ttl: 60 // 1 minute
    })

    return data
}

/**
 * 
 * @param {*} id 
 * @returns 
 */
exports.getWidgetDataCache = async (id) => {
    let res = await readCache({ key: WIDGET_DATA_CACHE_KEY, id });
    if (res) {
        return res;
    }

    return null
}

exports.updateAllowedOriginCache = async () => {
    const list = await projectModel.distinct("settings.allowedOrigin");
    const origin = (list || []).filter(item => typeof item === 'string' && item.length > 0);

    submitCreateCache({
        id: "cache",
        key: ALLOWED_ORIGIN_CACHE_KEY,
        data: origin,
    })

    return origin
}

exports.getAllowedOriginFromCache = async () => {
    let res = await readCache({ key: WIDGET_DATA_CACHE_KEY, id: "cache" });
    if (res) {
        return res;
    }

    return null
}