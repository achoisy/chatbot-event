const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const printSchema = new Schema({
  senderid: String,
  printName: String,
  pdfUrl: String,
  pdfWidth: Number,
  pdfHeight: Number,
  rotation_image: Boolean,
  orientation: String,
  printTitle: String,
  photoCount: Number,
  pageCount: Number,
  cover_public_id: String,
  photoList: [
    {
      imageId: Schema.Types.ObjectId,
      full_url: { type: String },
      optimiseImageUrl: String,
      author_pic: String,
      user_profile: {
        first_name: String,
        last_name: String,
        profile_pic: String,
        profile_public_id: String,
        locale: String,
        timezone: String,
        gender: String,
      },
      message: { type: String, maxlength: 120 },
      public_id: { type: String },
      width: Number,
      height: Number,
      dateTimeOriginal: Date,
      dateTimeHumain: String,
    },
  ],
  printable: { type: Boolean, default: false },
  printed: { type: Boolean, default: false },
  eventId: Schema.Types.ObjectId,
  event_info: {},
  welcome_msg: {},
  create_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Print', printSchema);
