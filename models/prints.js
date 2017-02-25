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
  photoList: Schema.Types.Mixed,
  printable: { type: Boolean, default: false },
  printed: { type: Boolean, default: false },
  eventId: Schema.Types.ObjectId,
  event_info: {},
  welcome_msg: {},
  create_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Print', printSchema);
