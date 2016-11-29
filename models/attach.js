const mongoose = require('mongoose');
// const mongoosastic = require('mongoosastic');

const Schema = mongoose.Schema;

const attachSchema = new Schema({
  userid: { type: String, required: true },
  eventid: { type: String, required: true },
  create_date: { type: Date, default: Date.now },
  content_type: { type: String },
  full_url: { type: String },
  optimiseImageUrl: String,
  thumbnail_url: { type: String },
  author_pic: String,
  message: { type: String, maxlength: 120 },
  public_id: { type: String },
  version: Number,
  signature: String,
  width: Number,
  height: Number,
  format: String,
  resource_type: String,
  tags: [String],
  bytes: Number,
  path: String,
  meta: {},
});

// attachSchema.plugin(mongoosastic);

module.exports = mongoose.model('Attach', attachSchema);
