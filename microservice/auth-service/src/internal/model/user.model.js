//@ts-check
const { mongoose } = require("../../shared/mongoose");
const { hashSchema } = require("../utils/subfield.model");
const { fieldEncryption } = require("../../shared/mongoose/plugins");
const { decryptSecret } = require("common/function");
const {
    WRITE_USER_USER_ROLE,
    READ_USER_USER_ROLE,
    WRITE_PROJECT_USER_ROLE,
    READ_PROJECT_USER_ROLE,
    WRITE_SETTINGS_USER_ROLE,
    READ_SETTINGS_USER_ROLE,
    WRITE_USER_INVITATION_USER_ROLE,
    READ_USER_INVITATION_USER_ROLE,
    READ_REPORT_USER_ROLE,
    WRITE_REPORT_USER_ROLE
} = require("common/constant");

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
        permissions: {
            type: [String],
            enum: {
                values: [
                    WRITE_USER_USER_ROLE,
                    READ_USER_USER_ROLE,
                    WRITE_PROJECT_USER_ROLE,
                    READ_PROJECT_USER_ROLE,
                    WRITE_SETTINGS_USER_ROLE,
                    READ_SETTINGS_USER_ROLE,
                    WRITE_USER_INVITATION_USER_ROLE,
                    READ_USER_INVITATION_USER_ROLE,
                    READ_REPORT_USER_ROLE,
                    WRITE_REPORT_USER_ROLE
                ],
                message: '{VALUE} is not supported'
            }
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
