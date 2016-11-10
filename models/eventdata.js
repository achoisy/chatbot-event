const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const eventDataSchema = new Schema({
  eventid: { type: String, required: true, unique: true },
  moderators: [String],
  join_users: [String],
  banned_users: [String],
  event_score: { type: Number, default: 0 }, // Global event score
  scoreby_user: [
    {
      eventid: String,
      score: Number,
    },
  ],
  attachments: [String],
});

module.exports = mongoose.model('EventData', eventDataSchema);
