const mongoose = require('mongoose');
const mongoosastic = require('mongoosastic');

const Schema = mongoose.Schema;

const eventSchema = new Schema({
  senderid: { type: String, required: true, es_indexed: true },
  admin_list: [String],
  password: String,
  event_info: {
    name: { type: String, es_indexed: true },
    description: { type: String, es_indexed: true },
    start_date: { type: Date, es_indexed: true },
    end_date: { type: Date, es_indexed: true },
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
eventSchema.plugin(mongoosastic);

module.exports = mongoose.model('Event', eventSchema);
