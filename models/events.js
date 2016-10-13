const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const eventSchema = new Schema({
  senderid: { type: String, required: true },
  admin_list: [String],
  password: String,
  event_info: {
    name: String,
    description: String,
    start_date: Date,
    end_date: Date,
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
  event_publish: { type: Boolean, default: false },
});

module.exports = mongoose.model('Event', eventSchema);
