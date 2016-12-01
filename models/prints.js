const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const printSchema = new Schema({
  senderid: String,
  printName: String,
  pdfUrl: String,
  pdfWidth: Number,
  pdfHeight: Number,
  peechoOrderId: String,
  photoCount: Number,
  pageCount: Number,
  photoList: [
    {
      imageId: Schema.Types.ObjectId,
      full_url: { type: String },
      optimiseImageUrl: String,
      author_pic: String,
      message: { type: String, maxlength: 120 },
      public_id: { type: String },
      width: Number,
      height: Number,
    },
  ],
  printable: { type: Boolean, default: false },
  printed: { type: Boolean, default: false },
  ordered: { type: Boolean, default: false },
  eventId: Schema.Types.ObjectId,
  event_info: {},
  welcome_msg: {},
  printLink: String,
});

module.exports = mongoose.model('Print', printSchema);
