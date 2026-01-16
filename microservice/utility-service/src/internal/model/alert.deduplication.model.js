//@ts-check
const { mongoose } = require("../../shared/mongoose");
const { ObjectId, } = mongoose.Schema.Types

const alertDeduplicationSchema = new mongoose.Schema({
    alert: {
        type: ObjectId,
        required: true,
        unique: true
    },
    expireAt: {
        type: Date,
        required: true
    },

}, { timestamps: true });

alertDeduplicationSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

const AlertDeduplicationModel = mongoose.model('AlertDeduplication', alertDeduplicationSchema);

module.exports = AlertDeduplicationModel
