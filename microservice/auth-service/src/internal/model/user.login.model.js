//@ts-check
const { mongoose } = require("../../shared/mongoose")
const { fieldEncryption } = require("../../shared/mongoose/plugins")

const { Mixed, ObjectId } = mongoose.Schema.Types;
const { EMAIL_PASSWORD_LOGIN_TYPE } = require("common/constant");
const { hashSchema } = require("../utils/subfield.model");
const { decryptSecret } = require("common/function");

const userLoginSchema = new mongoose.Schema(
    {
        user: {
            type: ObjectId,
            required: true,
        },
        key: {
            type: String,
            required: true,
        },
        type: {
            type: String,
            required: true,
            trim: true,
            index: true,
            enum: {
                values: [
                    EMAIL_PASSWORD_LOGIN_TYPE
                ],
                message: '{VALUE} is not supported'
            }
        },
        credentials: {
            type: Mixed,
            required: true,
        },
        hash: {
            type: hashSchema,
        },
        lastLogin: {
            at: {
                type: Date,
            },
            from: {
                ip: { type: String },
                userAgent: { type: String },
                location: { type: String } // city/country
            }
        },
    },
    {
        timestamps: true,
    }
);

userLoginSchema.index({ createdAt: 1 });
userLoginSchema.index({ updatedAt: 1 });
userLoginSchema.index({ key: 1, type: 1 }, { unique: true })
userLoginSchema.index({ user: 1, type: 1 }, { unique: true })

userLoginSchema.plugin(fieldEncryption, {
    fields: ["key"],
    secret: () => decryptSecret(process?.env?.ENC_CRYPTO_SECRET),
});

module.exports = mongoose.model("userLogin", userLoginSchema);
