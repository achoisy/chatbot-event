const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const eventDataSchema = new Schema({
  eventid: { type: String, required: true, unique: true },
  moderators: [String],
  join_users: [String],
  banned_users: [String],
  event_score: Number, // Global event score
  scoreby_user: [
    {
      eventid: String,
      score: Number,
    },
  ],
  attachments: [
    {
      create_date: { type: Date, default: Date.now },
      content_type: String,
      senderid: String,
      content: String,
      score: Number,
    },
  ],
});

module.exports = mongoose.model('EventData', eventDataSchema);
