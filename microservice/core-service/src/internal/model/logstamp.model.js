//@ts-check
const { mongoose } = require("../../shared/mongoose");
const {
    ObjectId,
} = mongoose.Schema.Types

const logstampSchema = new mongoose.Schema(
    {
        project: {
            type: ObjectId,
            index: true,
        },
        key: {
            type: String,
            required: true,
            trim: true,
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

module.exports = logstampSchema
