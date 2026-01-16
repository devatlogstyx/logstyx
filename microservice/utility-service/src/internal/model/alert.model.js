//@ts-check
const { mongoose } = require("../../shared/mongoose");
const { ObjectId, Mixed } = mongoose.Schema.Types

const alertSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
        maxLength: 128,
        index: true
    },
    project: {
        type: ObjectId,
        required: true,
        index: true
    },
    webhook: {
        type: ObjectId,
        required: true,
        index: true
    },
    config: {
        filter: {
            type: Mixed,
            required: true
        },
        template: {
            type: Mixed,
            required: true
        },
        deduplicationMinutes: {
            type: Number,
            default: 0
        }
    }


}, { timestamps: true });

alertSchema.index({ createdAt: 1 });
alertSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('alert', alertSchema);
