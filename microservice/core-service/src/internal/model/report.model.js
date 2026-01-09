//@ts-check
const { PUBLIC_REPORT_VISIBILITY, PRIVATE_REPORT_VISIBILITY, UNLISTED_REPORT_VISIBILITY } = require("common/constant");
const { mongoose } = require("../../shared/mongoose");

const reportSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 128,
    index: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  description: {
    type: String,
    maxLength: 500
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  visibility: {
    type: String,
    enum: [PUBLIC_REPORT_VISIBILITY, PRIVATE_REPORT_VISIBILITY, UNLISTED_REPORT_VISIBILITY],
    default: PRIVATE_REPORT_VISIBILITY
  }
}, { timestamps: true });

reportSchema.index({ createdAt: 1 });
reportSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('report', reportSchema);
