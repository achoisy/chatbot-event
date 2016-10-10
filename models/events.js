const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const eventSchema = new Schema({
  senderid: { type: String, required: true, unique: true },
  admin_list: [String],
  password: String,
  event_info: {
    name: String,
    description: String,
    start_date: Date,
    end_date: Date,
    location: {
      latitude: Number,
      longitude: Number,
    },
  },
  welcome_msg: {
    photo: String,
    video: String,
    texte: String,
    audio: String,
  },
});

module.exports = mongoose.model('Event', eventSchema);