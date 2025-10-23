//@ts-check
const { mongoose } = require("../../shared/mongoose");
const {
    ObjectId,
    Mixed
} = mongoose.Schema.Types

const logSchema = new mongoose.Schema(
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
        device: {
            type: Mixed,
        },
        context: {
            type: Mixed,
        },
        data: {
            type: Mixed,
        },
    },
    {
        timestamps: true,
    }
);

logSchema.index({ createdAt: 1 });
logSchema.index({ updatedAt: 1 });

module.exports = logSchema
