//@ts-check

const updateCache = async (key, id, model, submitCacheFunc, logger, ttl) => {
    let raw = await model.findById(id)
    if (!raw) {
        return null
    }

    const data = raw?.toJSON()
    submitCacheFunc({
        key,
        id,
        data,
        ttl
    }).catch((e) => logger?.error?.(e))

    return data

}

const getCache = async (key, id, model, readCacheFunc, submitCacheFunc, logger, ttl) => {
    let res = await readCacheFunc({ key, id });
    if (res) {
        return res;
    }

    return updateCache(key, id, model, submitCacheFunc, logger, ttl);

}

const useCache = ({
    ReadCache,
    SubmitCache,
    Log
}) => {
    return {
        updateCache: (key, id, model) => {
            return updateCache(key, id, model, SubmitCache, Log)
        },
        getCache: (key, id, model, ttl = 5 * 60) => {
            return getCache(key, id, model, ReadCache, SubmitCache, Log, ttl)
        }
    }
}

module.exports = {
    useCache
}