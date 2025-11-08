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
        default: () => new Date()
    }
}, {
    timeseries: {
        timeField: 'createdAt',
        metaField: 'level',
        granularity: 'seconds'
        // expireAfterSeconds will be set dynamically
    },
    timestamps: false,
    versionKey: false,
});

logstampSchema.index({ level: 1, createdAt: -1 });
logstampSchema.index({ key: 1, createdAt: -1 });

module.exports = logstampSchema;
