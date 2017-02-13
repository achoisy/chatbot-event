const mongoose = require('mongoose');

const Schema = mongoose.Schema;

const orderSchema = new Schema({
  senderid: String,
  eventid: Schema.Types.ObjectId,
  printid: Schema.Types.ObjectId,
  pdfUrl: String,
  peechoOrderId: String,
  peecho_url: String,
  orderStatus: String,
  peechoRes: {},
  create_date: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Order', orderSchema);
