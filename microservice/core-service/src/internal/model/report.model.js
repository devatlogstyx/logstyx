//@ts-check
const { mongoose } = require("../../shared/mongoose");
const {
    ObjectId
} = mongoose.Schema.Types

const reportSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
            maxLength: 128,
        },
        widgets: [
            {
                widget: {
                    type: ObjectId,
                    index: true
                },
                className: {
                    type: String, // like a classname for the fe report 
                },
            }
        ],
    },
);


reportSchema.index({ createdAt: 1 });
reportSchema.index({ updatedAt: 1 });

module.exports = mongoose.model("report", reportSchema);
