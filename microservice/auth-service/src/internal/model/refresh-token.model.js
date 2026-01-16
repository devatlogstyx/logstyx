//@ts-check
const { mongoose } =  require("../../shared/mongoose")

const refreshTokenSchema = new mongoose.Schema(
    {
        token: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        salt: {
            type: String,
            required: true,
            trim: true,
        },
        expiredAt: {
            type: Date,
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

refreshTokenSchema.index(
    { createdAt: 1 },
    { expireAfterSeconds: 60 * 60 * 24 * 7 }
);
refreshTokenSchema.index({ updatedAt: 1 });

module.exports = mongoose.model("refreshToken", refreshTokenSchema);
