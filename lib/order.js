const Order = require('../models/orders.js');

const order = module.export = {
  addNew: (senderId, eventId, printId, callback) => {
    const newOrder = new Order({
      senderid: senderId,
      eventid: eventId,
      printid: printId,
      orderStatus: 'new',
    });
    newOrder.save((err, orderObj) => {
      if (err) throw Error(`order addNew.newOrder.save: ${err}`);

      callback(orderObj);
    });
  },
  update: (peechoReq, peechoUrl, callback) => {
    Order.findById(peechoReq.merchantId, (err, orderObj) => {
      if (err) throw Error(`order updateOrder.Order.findById: ${err}`);

      if (orderObj) {
        orderObj.peechoOrderId = peechoReq.peechoId;
        orderObj.orderStatus = 'paid';
        orderObj.peecho_url = peechoUrl;
        orderObj.save(callback(orderObj));
      } else {
        throw Error('Empty orderObj in order.updateOrder.Order.findById');
      }
    });
  },
  // TODO: creation d'une alert si le statusCode pas egale a 200
  updatePeechoRes: (orderId, peechoRes) => {
    Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { "peechoRes.statusCode": peechoRes.statusCode, "peechoRes.body": peechoRes.body } }
    ).exec()
    .catch((err) => { throw Error(`order updatePeechoRes.Order.findOneAndUpdate: ${err}`); });
  },
  updateStatus: (orderId, callback) => {
    Order.findOneAndUpdate(
      { _id: orderId },
      { $set: { orderStatus: 'filling' } }
    ).exec()
    .catch((err) => { throw Error(`order updateStatus.Order.findOneAndUpdate: ${err}`); })
    .then(callback());
  },
};
