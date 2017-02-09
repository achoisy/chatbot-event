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
  event_cloture: { type: Boolean, default: false },
  event_printId: Schema.Types.ObjectId,
  create_date: { type: Date, default: Date.now },
  moderators: [String],
  join_users: [String],
  banned_users: [String],
  attach_to_validate: [Schema.Types.ObjectId],
  valide_attach: [Schema.Types.ObjectId],
  not_valide_attach: [Schema.Types.ObjectId],
});
// eventSchema.plugin(mongoosastic);
eventSchema.index({ 'event_info.name': 'text' });

module.exports = mongoose.model('Event', eventSchema);
