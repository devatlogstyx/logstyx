//@ts-check

const {

    USER_CACHE_KEY,
    USER_LOGIN_CACHE_KEY,
} = require("common/constant")

const { submitCreateCache } = require("../provider/mq-producer")

const { readCache } = require("./../provider/cache.service")
const { useCache } = require("common/hooks")

const { logger: Log } = require("../logger")

const { updateCache, getCache } = useCache({
    ReadCache: readCache,
    SubmitCache: submitCreateCache,
    Log
})
const userModel = require("./../../internal/model/user.model")
const userLoginModel = require("../../internal/model/user.login.model")
const { mapUser } = require("../../internal/utils/mapper")

exports.updateUserCache = async (id) => updateCache(USER_CACHE_KEY, id, userModel).then(mapUser)
exports.getUserFromCache = async (id) => getCache(USER_CACHE_KEY, id, userModel).then(mapUser)
exports.updateUserLoginCache = async (id) => updateCache(USER_LOGIN_CACHE_KEY, id, userLoginModel)
exports.getUserLoginFromCache = async (id) => getCache(USER_LOGIN_CACHE_KEY, id, userLoginModel)