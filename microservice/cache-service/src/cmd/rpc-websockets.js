// @ts-check

const { readCache } = require("./../internal/service/cache");

const {
    CACHE_READ_WSROUTE,
} = require("common/routes/rpc-websockets");

exports.init = (rpc) => {

    rpc.use(CACHE_READ_WSROUTE, async ({ key, id }) => {
        let res = await readCache(key, id);
        if (!res) {
            return null;
        }

        return res;
    });


};
