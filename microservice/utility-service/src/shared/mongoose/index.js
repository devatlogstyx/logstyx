//@ts-check

//@ts-check
const mongoosePackage = require("mongoose")
const { useMongoose } = require("common/hooks")
const { logger: Log } = require("../logger");
const {
    connectToDB,
    mongoose,
    isValidObjectId
} = useMongoose({
    Mongoose: mongoosePackage,
    DbName: "UtilityService",
    Log
})

const { toJSON, paginate, aggregatePaginate } = require("./plugins");

mongoose.plugin(toJSON);
mongoose.plugin(paginate);
mongoose.plugin(aggregatePaginate);

module.exports = {
    mongoose,
    connectToDB,
    isValidObjectId
};

