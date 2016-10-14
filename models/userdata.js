const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userDataSchema = new Schema({
  userid: { type: String, required: true, unique: true },
  admin: [String],  // List of administrated events
  moderator: [String],  // List of moderated events
  join_events: [String],  // List of joinned events
  banned_events: [String],  // List of banned from events
  user_score: { type: Number, default: 0 }, // Global Score
  scoreby_event: [
    {
      eventid: String,
      score: Number,
    },
  ],
  attachments: [String],
});

module.exports = mongoose.model('UserData', userDataSchema);
