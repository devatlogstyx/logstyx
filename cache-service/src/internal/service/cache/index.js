const useRedis = !!process.envREDIS_URL;
module.exports = useRedis
    ? require("./redis")
    : require("./node-cache");
