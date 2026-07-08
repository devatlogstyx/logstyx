const { useRepository } = require("common/hooks");
const { isValidObjectId } = require("../../shared/mongoose");

const makeRepo = (path, options = {}) => useRepository({
    Model: require(path),
    ObjectIdValidator: isValidObjectId,
    ...options,
});

module.exports = {
    Alerts: makeRepo("./alert.model"),
    Webhooks: makeRepo("./webhook.model"),
    AlertDeduplications: makeRepo("./alert.deduplication.model"),
}
