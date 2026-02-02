//@ts-check

const { mongoose } = require("../../shared/mongoose");
const { ObjectId } = mongoose.Schema.Types
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
const bucketSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            index: true,
            maxLength: 128,
        },
        projects: {
            type: [ObjectId],
            required: true,
            index: true,

        },
        settings: {
            type: SettingSchema
        }
    },
    {
        timestamps: true,
    }
);

bucketSchema.index({ createdAt: 1 });
bucketSchema.index({ updatedAt: 1 });

module.exports = mongoose.model("bucket", bucketSchema);
