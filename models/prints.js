const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const printSchema = new Schema({
  senderid: { type: String, required: true, unique: true },
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
  printed: { type: Boolean, default: false },
  ordered: { type: Boolean, default: false },
});

module.exports = mongoose.model('Print', printSchema);
