// right now we use internal node cache, but you can build with redist from here 
// @ts-check

const NodeCache = require("node-cache");
const cache = new NodeCache();
const makeKey = (key, id) => `${key}-${id}`;

exports.createCache = async (key, id, data, ttl = 5 * 60) => {
    return cache.set(makeKey(key, id), data, ttl);
}

exports.readCache = async (key, id) => {
    return cache.get(makeKey(key, id));
}
exports.removeCache = async (key, id) => {
    return cache.del(makeKey(key, id));
}