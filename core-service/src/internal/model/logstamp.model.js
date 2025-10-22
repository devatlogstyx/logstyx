//@ts-check
const { mongoose } = require("../../shared/mongoose");
const {
    ObjectId,
} = mongoose.Schema.Types

const logstampSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        project: {
            type: ObjectId,
            required: true,
            index: true,
        },
        level: {
            type: String,
            required: true,
            index: true
        },
    },
    {
        timestamps: true,
    }
);

logstampSchema.index({ createdAt: 1 });
logstampSchema.index({ updatedAt: 1 });

module.exports = mongoose.model("logstamp", logstampSchema);
