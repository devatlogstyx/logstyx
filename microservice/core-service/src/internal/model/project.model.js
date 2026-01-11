//@ts-check
const { fieldEncryption } = require("mongoose-field-encryption");
const { mongoose } = require("../../shared/mongoose");
const { decryptSecret } = require("common/function");
const { FULL_PAYLOAD_DEDUPLICATION_STRATEGY, INDEX_ONLY_DEDUPLICATION_STRATEGY, NONE_DEDUPLICATION_STRATEGY } = require("common/constant");

const SettingSchema = new mongoose.Schema(
    {
        indexes: { // indexed field but hashed,
            type: [String],
            index: true,
        },
        rawIndexes: { // indexed field without being hashed
            type: [String],
            index: true,
        },
        allowedOrigin: {
            type: [String],
            index: true,
        },
        retentionHours: {
            type: Number,
            index: true,
        },
        deduplicationStrategy: {
            type: String,
            index: true,
            enum: {
                values: [
                    FULL_PAYLOAD_DEDUPLICATION_STRATEGY,
                    INDEX_ONLY_DEDUPLICATION_STRATEGY,
                    NONE_DEDUPLICATION_STRATEGY
                ],
                message: '{VALUE} is not supported'
            },
            default: FULL_PAYLOAD_DEDUPLICATION_STRATEGY
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
