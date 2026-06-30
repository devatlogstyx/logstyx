const { useRepository } = require("common/hooks");
const { isValidObjectId } = require("../../shared/mongoose");
const { mapUser } = require("../factory/user");

const makeRepo = (path, options = {}) => useRepository({
    Model: require(path),
    ObjectIdValidator: isValidObjectId,
    ...options,
});


module.exports = {
    UserInvitations: makeRepo("./user.invitation.model", {
        decrypt: true
    }),
    Users: makeRepo("./user.model", {
        Mapper: mapUser,
        decrypt: true
    }),
    UserLogins: makeRepo("./user.login.model", {
        decrypt: true
    }),
    RefreshTokens: makeRepo("./refresh-token.model", {
        decrypt: true
    }),
}
