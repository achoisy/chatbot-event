const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const eventSchema = new Schema({
  senderid: { type: String, required: true },
  admin_list: [String],
  password: String,
  event_info: {
    name: { type: String },
    description: { type: String },
    start_date: { type: Date },
    end_date: { type: Date },
    location: {
      lat: Number,
      long: Number,
    },
  },
  welcome_msg: {
    photo: String,
    video: String,
    texte: String,
    audio: String,
  },
  cover_public_id: String,
  event_publish: { type: Boolean, default: true },
  create_date: { type: Date, default: Date.now },
});
// eventSchema.plugin(mongoosastic);
eventSchema.index({ 'event_info.name': 'text' });

module.exports = mongoose.model('Event', eventSchema);
