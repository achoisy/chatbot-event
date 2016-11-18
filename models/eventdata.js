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
  attach_to_validate: [Schema.Types.ObjectId],
  valide_attach: [Schema.Types.ObjectId],
  not_valide_attach: [Schema.Types.ObjectId],
});

module.exports = mongoose.model('EventData', eventDataSchema);
