//@ts-check
const { mongoose } = require("../../shared/mongoose");
const {
    Mixed,
    ObjectId
} = mongoose.Schema.Types

const widgetSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
            maxLength: 128,
        },
        project: {
            type: ObjectId,
            required: true,
            index: true
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
