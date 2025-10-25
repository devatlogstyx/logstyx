//@ts-check
const { mongoose } = require("../../shared/mongoose");

const logstampSchema = new mongoose.Schema({
    key: {
        type: String,
        required: true,
        index: true,
        trim: true
    },
    level: {
        type: String,
        required: true,
        index: true,
    },
    createdAt: {
        type: Date,
        required: true,
        default: () => new Date()  // Auto-generate if not provided
    }
}, {
    timeseries: {
        timeField: 'createdAt',
        metaField: 'level',  // Groups data by project
        granularity: 'seconds' // or 'minutes' for less frequent logs
    },
    timestamps: false,  // Don't use Mongoose timestamps
    versionKey: false,
    expireAfterSeconds: 15 * 24 * 60 * 60  // Auto-delete after 30 days
});

// Indexes for common queries
logstampSchema.index({ project: 1, level: 1, createdAt: -1 });
logstampSchema.index({ project: 1, key: 1, createdAt: -1 });

module.exports = logstampSchema
