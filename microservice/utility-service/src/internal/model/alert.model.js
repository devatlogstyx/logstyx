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
    filter: {
        type: Mixed,
        required: true
    },
    webhook: {
        type: ObjectId,
        required: true,
        index: true
    },
    template: {
        type: Mixed,
        required: true
    },

}, { timestamps: true });

alertSchema.index({ createdAt: 1 });
alertSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('alert', alertSchema);
