const mongoose = require('mongoose');
const mongoosastic = require('mongoosastic');

const Schema = mongoose.Schema;

const attachSchema = new Schema({
  userid: { type: String, required: true },
  eventid: { type: String, required: true },
  create_date: { type: Date, default: Date.now },
  content_type: { type: String },
  content: String,
  score: Number,
  safeSearch: {
    adult: Boolean,
    medical: Boolean,
    spoof: Boolean,
    violence: Boolean,
  },
  faces: [Schema.Types.Mixed],
  labels: [Schema.Types.Mixed],
  landmarks: [Schema.Types.Mixed],
  logos: [Schema.Types.Mixed],
  text: [Schema.Types.Mixed],
});

attachSchema.plugin(mongoosastic);

module.exports = mongoose.model('Attach', attachSchema);
