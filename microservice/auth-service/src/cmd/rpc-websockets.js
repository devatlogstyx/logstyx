// @ts-check

const {
    FIND_USER_BY_ID_WSROUTE,
} = require("common/routes/rpc-websockets");
const { findUserById } = require("../internal/service/user");

/**
 * 
 * @param {*} rpc 
 */
exports.init = (rpc) => {

    // @ts-ignore
    rpc.use(FIND_USER_BY_ID_WSROUTE, async ({ id }) => {
        return findUserById(id)
    });

};
