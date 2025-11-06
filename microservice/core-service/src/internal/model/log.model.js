//@ts-check
const { mongoose } = require("../../shared/mongoose");
const {
    ObjectId,
    Mixed
} = mongoose.Schema.Types
const { fieldEncryption } = require("../../shared/mongoose/plugins");
const { decryptSecret } = require("common/function");

const logSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        level: {
            type: String,
            required: true,
            index: true
        },
        device: {
            type: Mixed,
        },
        data: {
            type: Mixed,
        },
        hash: {
            type: Mixed,
        },
        count: {
            type: Number,
            default: 1,
            min: 1
        }

    },
    {
        timestamps: true,
    }
);

logSchema.index({ createdAt: 1 });
logSchema.index({ updatedAt: 1 });
logSchema.plugin(fieldEncryption, {
    fields: ["data"],
    secret: () => decryptSecret(process?.env?.ENC_CRYPTO_SECRET),
});

module.exports = logSchema
