//@ts-check

const { PROJECT_CACHE_KEY } = require("common/constant")

const { submitCreateCache } = require("../provider/mq-producer")

const { readCache } = require("../provider/cache.service")
const { useCache } = require("common/hooks")

const { logger: Log } = require("../logger")
const projectModel = require("../../internal/model/project.model")

const { updateCache, getCache } = useCache({
    ReadCache: readCache,
    SubmitCache: submitCreateCache,
    Log
})

exports.updateProjectCache = async (id) => updateCache(PROJECT_CACHE_KEY, id, projectModel)
exports.getProjectFromCache = async (id) => getCache(PROJECT_CACHE_KEY, id, projectModel)

