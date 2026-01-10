//@ts-check
const { mongoose } = require("../../shared/mongoose");

const widgetSchema = new mongoose.Schema({
  report: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'report',
    required: true,
    index: true
  },
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'project',
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
    maxLength: 128
  },
  description: {
    type: String,
  },
  config: {
    type: mongoose.Schema.Types.Mixed,
    required: true
  }
}, { timestamps: true });

widgetSchema.index({ createdAt: 1 });
widgetSchema.index({ updatedAt: 1 });

module.exports = mongoose.model('widget', widgetSchema);
