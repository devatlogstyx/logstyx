//@ts-check
const { fieldEncryption } = require("mongoose-field-encryption");
const { mongoose } = require("../../shared/mongoose");
const { decryptSecret } = require("common/function");
const { FULL_PAYLOAD_DEDUPLICATION_STRATEGY, INDEX_ONLY_DEDUPLICATION_STRATEGY, NONE_DEDUPLICATION_STRATEGY } = require("common/constant");

const SettingSchema = new mongoose.Schema(
    {
       
        allowedOrigin: {
            type: [String],
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
