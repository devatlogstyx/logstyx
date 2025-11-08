//@ts-check
const { mongoose } = require("../../shared/mongoose");
const {
    Mixed
} = mongoose.Schema.Types

const logSchema = new mongoose.Schema(
    {
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
        hash: {
            type: Mixed,
        },
        count: {
            type: Number,
            default: 1,
            min: 1
        }

    },
    {
        timestamps: true,
    }
);

logSchema.index({ updatedAt: 1 });

module.exports = logSchema
