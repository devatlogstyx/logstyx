//@ts-check
const { ACTIVE_PROBE_STATUS, PAUSED_PROBE_STATUS } = require("common/constant");
const { mongoose } = require("../../shared/mongoose");

const probeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
            maxLength: 128,
        },
        project: {
            type: String,
            required: true,
            trim: true,
            index: true,
            unique: true
        },
        delay: {// in seconds
            type: Number,
            required: true,
            index: true,
            min: 5,
            max: 60
        },
        status: {
            type: String,
            index: true,
            enum: {
                values: [
                    ACTIVE_PROBE_STATUS,
                    PAUSED_PROBE_STATUS
                ],
                message: '{VALUE} is not supported'
            },
            default: ACTIVE_PROBE_STATUS
        },
        /**
         * An encrypted string from a connection object,
         * connection: {
                method: "GET",
                url: "http://server01:9100/metrics",
                auth: {
                    type: "hmac",
                    secret: "secret-key"
                },
                timeout: 10000,
            }
         */
        connection: {
            type: String,
        },
    },
    {
        timestamps: true,
    }
);

probeSchema.index({ createdAt: 1 });
probeSchema.index({ updatedAt: 1 });


module.exports = mongoose.model("probe", probeSchema);
