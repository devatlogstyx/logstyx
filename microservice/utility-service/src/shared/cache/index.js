//@ts-check

const { WEBHOOK_CACHE_KEY, ALERT_CACHE_KEY } = require("common/constant")

const { submitCreateCache } = require("../provider/mq-producer")

const { readCache } = require("./../provider/cache.service")
const { useCache } = require("common/hooks")

const { logger: Log } = require("../logger")
const { Webhooks, Alerts } = require("../../internal/model")

const { updateCache, getCache } = useCache({
    ReadCache: readCache,
    SubmitCache: submitCreateCache,
    Log
})

exports.updateWebhookCache = async (id) => updateCache(WEBHOOK_CACHE_KEY, id, Webhooks)
exports.getWebhookFromCache = async (id) => getCache(WEBHOOK_CACHE_KEY, id, Webhooks)

exports.updateAlertCache = async (id) => updateCache(ALERT_CACHE_KEY, id, Alerts)
exports.getAlertFromCache = async (id) => getCache(ALERT_CACHE_KEY, id, Alerts)

