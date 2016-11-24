const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userDataSchema = new Schema({
  userid: { type: String, required: true, unique: true },
  moderator: [Schema.Types.Mixed],  // List of moderated events
  join_events: [Schema.Types.Mixed], // [ {eventid: _id, print: number}]
    // List of joinned events
});

module.exports = mongoose.model('UserData', userDataSchema);
