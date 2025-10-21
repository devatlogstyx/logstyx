//@ts-check
const { mongoose } = require("./../../shared/mongoose")

exports.hashSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            index: true
        },
        email: {
            type: String,
            index: true
        },
        mobile: {
            type: String,
            index: true
        },
    }
)
