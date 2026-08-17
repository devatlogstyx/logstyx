const { useRepository } = require("common/hooks");
const { isValidObjectId } = require("../../shared/mongoose");
const { mapProjectUser, mapBucket, mapProject } = require("../utils/mapper");

const makeRepo = (path, options = {}) => useRepository({
    Model: require(path),
    ObjectIdValidator: isValidObjectId,
    ...options,
});

module.exports = {
    Buckets: makeRepo("./bucket.model", {
        Mapper: mapBucket
    }),
    Projects: makeRepo("./project.model", {
        Mapper: mapProject
    }),
    ProjectUsers: makeRepo("./project.user.model", {
        Mapper: mapProjectUser
    }),
    Probes: makeRepo("./probe.model"),
    Reports: makeRepo("./report.model"),
    Widgets: makeRepo("./widget.model"),
}
