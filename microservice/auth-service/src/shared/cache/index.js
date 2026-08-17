//@ts-check

const {

    USER_CACHE_KEY,
    USER_LOGIN_CACHE_KEY,
} = require("common/constant")

const { submitCreateCache } = require("../provider/mq-producer")

const { readCache } = require("./../provider/cache.service")
const { useCache } = require("common/hooks")

const { logger: Log } = require("../logger")
const { Users, UserLogins } = require("../../internal/model")

const { updateCache, getCache } = useCache({
    ReadCache: readCache,
    SubmitCache: submitCreateCache,
    Log
})

/**
 *
 * @param {string} id
 * @returns
 */
exports.updateUserCache = async (id) => updateCache(USER_CACHE_KEY, id, Users)

/**
 *
 * @param {string} id
 * @returns
 */
exports.getUserFromCache = async (id) => getCache(USER_CACHE_KEY, id, Users)

/**
 *
 * @param {string} id
 * @returns
 */
exports.updateUserLoginCache = async (id) => updateCache(USER_LOGIN_CACHE_KEY, id, UserLogins)

/**
 *
 * @param {string} id
 * @returns
 */
exports.getUserLoginFromCache = async (id) => getCache(USER_LOGIN_CACHE_KEY, id, UserLogins)