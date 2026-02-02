//@ts-check
const { mongoose } = require("../../shared/mongoose");
const { Mixed, ObjectId } = mongoose.Schema.Types

const widgetSchema = new mongoose.Schema({
  report: {
    type: ObjectId,
    ref: 'report',
    required: true,
    index: true
  },
  bucket: {
    type: ObjectId,
    ref: 'bucket',
    required: true
  },
  template: {
    type: String,
    required: true,
    enum: ['total_value', 'line_chart', 'bar_chart', 'table', 'pie_chart']
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxLength: 128
  },
  description: {
    type: String,
  },
  config: {
    type: Mixed,
    required: true
  },
  position: {
    type: Mixed,
    required: true
  }
}, { timestamps: true });

widgetSchema.index({ createdAt: 1 });
widgetSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('widget', widgetSchema);
