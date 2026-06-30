const { useRepository } = require("common/hooks");
const { isValidObjectId } = require("../../shared/mongoose");

const makeRepo = (path, options = {}) => useRepository({
    Model: require(path),
    ObjectIdValidator: isValidObjectId,
    ...options,
});


module.exports = {
    UserInvitations: makeRepo("./user.invitation.model"),
    Users: makeRepo("./user.model"),
    UserLogins: makeRepo("./user.login.model"),
}
