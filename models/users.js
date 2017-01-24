const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const userSchema = new Schema({
  senderid: { type: String, required: true, unique: true },
  user_profile: {
    first_name: String,
    last_name: String,
    profile_pic: String,
    profile_public_id: String,
    locale: String,
    timezone: String,
    gender: String,
  },
  user_mobile: {
    mobile_number: String,
    // Numero verifié
    verified: { type: Boolean, default: false },
    // Numero en cours de verification
    verif_proc: { type: Boolean, default: false },
  },
  last_payload: String,
  next_payload: String,
  context: {},
  address: {
    addressLine1: String,
    addressLine2: String,
    zipCode: Number,
    city: String,
    state: String,
    country: String,
    countryCode: String,
  },
  create_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', userSchema);
