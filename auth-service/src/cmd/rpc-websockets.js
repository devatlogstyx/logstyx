// @ts-check

const {
    FIND_USER_BY_ID_WSROUTE,
} = require("common/routes/rpc-websockets");
const { findUserById } = require("../internal/service/user");

exports.init = (rpc) => {

    rpc.use(FIND_USER_BY_ID_WSROUTE, async ({ id }) => {
        return findUserById(id)
    });

};
