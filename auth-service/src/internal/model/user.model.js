//@ts-check
const { mongoose } = require("../../shared/mongoose");
const { hashSchema } = require("../utils/subfield.model");
const { fieldEncryption } = require("../../shared/mongoose/plugins");
const { decryptSecret } = require("common/function");

const userSchema = new mongoose.Schema(
    {
        fullname: {
            type: String,
            required: true,
            trim: true,
            index: true,
            maxLength: 128,
        },
        email: {
            type: String,
        },
        image: {
            type: String,
            maxLength: 2048,
        },
        hash: {
            type: hashSchema,
        },
    },
    {
        timestamps: true,
    }
);

userSchema.index({ createdAt: 1 });
userSchema.index({ updatedAt: 1 });
userSchema.plugin(fieldEncryption, {
    fields: ["email"],
    secret: () => decryptSecret(process?.env?.ENC_CRYPTO_SECRET),
});

module.exports = mongoose.model("user", userSchema);
