//@ts-check
const { mongoose } = require("../../shared/mongoose");
const { hashSchema } = require("../utils/subfield.model");
const { fieldEncryption } = require("../../shared/mongoose/plugins");
const { decryptSecret } = require("common/function");
const { ObjectId } = mongoose.Schema.Types;
const {
    WRITE_USER_USER_ROLE,
    READ_USER_USER_ROLE,
    WRITE_PROJECT_USER_ROLE,
    READ_PROJECT_USER_ROLE,
    WRITE_USER_INVITATION_USER_ROLE,
    READ_USER_INVITATION_USER_ROLE,
    WRITE_WEBHOOK_USER_ROLE,
    READ_WEBHOOK_USER_ROLE,
    WRITE_BUCKET_USER_ROLE,
    READ_BUCKET_USER_ROLE

} = require("common/constant");

const userInvitationSchema = new mongoose.Schema(
    {

        email: {
            type: String,
            required: true,
            index: true,
            lowercase: true
        },
        permissions: {
            type: [String],
            enum: {
                values: [
                    WRITE_USER_USER_ROLE,
                    READ_USER_USER_ROLE,
                    WRITE_PROJECT_USER_ROLE,
                    READ_PROJECT_USER_ROLE,
                    WRITE_USER_INVITATION_USER_ROLE,
                    READ_USER_INVITATION_USER_ROLE,
                    WRITE_WEBHOOK_USER_ROLE,
                    READ_WEBHOOK_USER_ROLE,
                    WRITE_BUCKET_USER_ROLE,
                    READ_BUCKET_USER_ROLE
                ],
                message: '{VALUE} is not supported'
            }
        },
        projects: {
            type: [ObjectId]
        },
        hash: {
            type: hashSchema,
        },
    },
    {
        timestamps: true,
    }
);

userInvitationSchema.index({ createdAt: 1 });
userInvitationSchema.index({ updatedAt: 1 });
userInvitationSchema.plugin(fieldEncryption, {
    fields: ["email"],
    secret: () => decryptSecret(process?.env?.ENC_CRYPTO_SECRET),
});

module.exports = mongoose.model("userInvitation", userInvitationSchema);
