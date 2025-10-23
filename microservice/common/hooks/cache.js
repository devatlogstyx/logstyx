//@ts-check

const updateCache = async (key, id, model, submitCacheFunc, logger) => {
    let raw = await model.findById(id)
    if (!raw) {
        return null
    }

    const data = raw?.toJSON()
    submitCacheFunc({
        key,
        id,
        data
    }).catch((e) => logger?.error?.(e))

    return data

}

const getCache = async (key, id, model, readCacheFunc, submitCacheFunc, logger) => {
    let res = await readCacheFunc({ key, id });
    if (res) {
        return res;
    }

    return updateCache(key, id, model, submitCacheFunc, logger);

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
        getCache: (key, id, model) => {
            return getCache(key, id, model, ReadCache, SubmitCache, Log)
        }
    }
}

module.exports = {
    useCache
}