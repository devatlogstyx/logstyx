const useRedis = !!(process.env.REDIS_URL || process.env.ENC_REDIS_URL);
module.exports = useRedis
    ? require("./redis")
    : require("./node-cache");
