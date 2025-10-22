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
            required: true,
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
            required: true
        },
        context: {
            type: Mixed,
            required: true
        },
        data: {
            type: Mixed,
            required: true
        },
    },
    {
        timestamps: true,
    }
);

logSchema.index({ createdAt: 1 });
logSchema.index({ updatedAt: 1 });

module.exports = mongoose.model("log", logSchema);
