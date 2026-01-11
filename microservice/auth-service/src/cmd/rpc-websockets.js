// @ts-check

const {
    FIND_USER_BY_ID_WSROUTE,
    CAN_USER_DO_WSROUTE,
} = require("common/routes/rpc-websockets");
const { findUserById } = require("../internal/service/user");
const { CanUserDo } = require("../internal/utils/helper");

/**
 * 
 * @param {*} rpc 
 */
exports.init = (rpc) => {

    // @ts-ignore
    rpc.use(FIND_USER_BY_ID_WSROUTE, async ({ id }) => {
        return findUserById(id)
    });

    // @ts-ignore
    rpc.use(CAN_USER_DO_WSROUTE, async ({ userId, access }) => {
        return CanUserDo(userId, access)
    });

};
