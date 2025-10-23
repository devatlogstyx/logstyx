//@ts-check

const { useMongoosePlugins } = require("common/hooks")
const { toJSON, paginate } = useMongoosePlugins()
const aggregatePaginate = require('mongoose-aggregate-paginate');
const { fieldEncryption } = require("mongoose-field-encryption");
module.exports = {
    toJSON,
    paginate,
    aggregatePaginate,
    fieldEncryption
}