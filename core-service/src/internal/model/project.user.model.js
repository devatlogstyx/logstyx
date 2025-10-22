//@ts-check
const { mongoose } = require("../../shared/mongoose");
const { userSchema } = require("../utils/subfield.model");
const {
    ObjectId
} = mongoose.Schema.Types

const projectUserSchema = new mongoose.Schema(
    {
        project: {
            type: ObjectId,
            required: true,
            trim: true,
            index: true,
            maxLength: 128,
        },
        user: {
            type: userSchema,
            required: true
        },
    },
    {
        timestamps: true,
    }
);

projectUserSchema.index({ createdAt: 1 });
projectUserSchema.index({ updatedAt: 1 });

module.exports = mongoose.model("projectUser", projectUserSchema);
