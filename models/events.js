const mongoose = require('mongoose');
const mongoosastic = require('mongoosastic');

const Schema = mongoose.Schema;

const eventSchema = new Schema({
  senderid: { type: String, required: true, es_indexed: true },
  admin_list: [String],
  password: String,
  event_info: {
    name: { type: String, es_indexed: true },
    description: String,
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
  event_publish: { type: Boolean, default: true },
});
eventSchema.plugin(mongoosastic);

module.exports = mongoose.model('Event', eventSchema);
