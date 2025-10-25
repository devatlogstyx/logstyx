// @ts-check

const { CREATE_LOG_WSROUTE } = require("common/routes/rpc-websockets");
const { processCreateLog } = require("../internal/service/logger");

/**
 * 
 * @param {*} rpc 
 */
exports.init = (rpc) => {

    rpc.use(CREATE_LOG_WSROUTE, async (/** @type {{ device: object; context: object; data: object; level: string; timestamp: string | number | Date; }} */ params) => {
        return processCreateLog(params)
    });
};
