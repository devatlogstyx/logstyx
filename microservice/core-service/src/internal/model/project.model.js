//@ts-check
const { fieldEncryption } = require("mongoose-field-encryption");
const { mongoose } = require("../../shared/mongoose");
const { decryptSecret } = require("common/function");

const SettingSchema = new mongoose.Schema(
    {
        indexes: {
            type: [String],
            index: true,
        },
        allowedOrigin: {
            type: [String],
            index: true,
        },
        retentionDays: {
            type: Number,
            index: true,
        },
    }
)
const projectSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
            maxLength: 128,
        },
        slug: {
            type: String,
            required: true,
            trim: true,
            index: true,
            unique: true
        },
        secret: {
            type: String,
        },
        settings: {
            type: SettingSchema
        }
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
