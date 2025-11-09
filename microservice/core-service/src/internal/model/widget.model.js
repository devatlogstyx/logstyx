//@ts-check
const { mongoose } = require("../../shared/mongoose");
const {
    ObjectId,
    Mixed
} = mongoose.Schema.Types

const widgetSchema = new mongoose.Schema(
    {
        title: {
            type: ObjectId,
            required: true,
            trim: true,
            index: true,
            maxLength: 128,
        },
        config: {
            type: Mixed,
            required: true
        },
    },
    {
        timestamps: true,
    }
);

widgetSchema.index({ createdAt: 1 });
widgetSchema.index({ updatedAt: 1 });

module.exports = mongoose.model("widget", widgetSchema);
