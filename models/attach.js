const mongoose = require('mongoose');
// const mongoosastic = require('mongoosastic');

const Schema = mongoose.Schema;

const attachSchema = new Schema({
  userid: { type: String, required: true },
  eventid: { type: String, required: true },
  create_date: { type: Date, default: Date.now },
  content_type: { type: String },
  full_url: { type: String },
  thumbnail_url: { type: String },
  message: { type: String, maxlength: 120 },
  meta: {},
});

// attachSchema.plugin(mongoosastic);

module.exports = mongoose.model('Attach', attachSchema);
