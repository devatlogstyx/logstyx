//@ts-check
const { mongoose } = require("./../../shared/mongoose")
const {
    ObjectId
} = mongoose.Schema.Types


exports.userSchema = new mongoose.Schema(
    {
        userId: {
            type: ObjectId,
            index: true
        },
        fullname: {
            type: String,
            index: true
        },
    }
)
