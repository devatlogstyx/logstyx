//@ts-check
const { fieldEncryption } = require("mongoose-field-encryption");
const { mongoose } = require("../../shared/mongoose");
const { decryptSecret } = require("common/function");

const projectSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
            maxLength: 128,
        },
        secret: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

projectSchema.index({ createdAt: 1 });
projectSchema.index({ updatedAt: 1 });
projectSchema.plugin(fieldEncryption, {
    fields: ["secret"],
    secret: () => decryptSecret(process?.env?.ENC_CRYPTO_SECRET),
});

module.exports = mongoose.model("project", projectSchema);
