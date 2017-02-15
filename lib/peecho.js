const CryptoJS = require('crypto-js');
const request = require('request');


const peecho = module.exports = {
  checkSecret: (peechoQuery, callback) => {
    const buildData = peechoQuery.peechoId + peechoQuery.merchantId;
    const genSecret = CryptoJS.HmacSHA1(buildData, process.env.PEECHO_SECRET_KEY)
    .toString(CryptoJS.enc.Base64);

    if (peechoQuery.secret === genSecret) {
      callback(true);
    } else {
      callback(false);
    }
  },
  generateSecret: (peechoId, merchantId, pdfurl, callback) => {
    // const buildData = peechoId + process.env.PEECHO_MERCHANT_KEY + pdfurl;
    const buildData = peechoId + merchantId + pdfurl;
    const genSecret = CryptoJS.HmacSHA1(buildData, process.env.PEECHO_SECRET_KEY)
    .toString(CryptoJS.enc.Base64);

    callback(genSecret);
  },
  sendPdfUrl: (orderObj, pdfUrl, callback) => {
    if (!pdfUrl) throw Error(`Error in print.sendPdfUrlToPeecho: No pdfUrl found !`);

    peecho.generateSecret(orderObj.peechoOrderId, orderObj._id, pdfUrl,
      (genSecret) => {
        request.post(
          'http://www.peecho.com/rest/order/set_source_url',
          {
            form: {
              orderId: orderObj.peechoOrderId,
              sourceUrl: pdfUrl,
              merchantApiKey: process.env.PEECHO_MERCHANT_KEY,
              secret: genSecret,
            },
          },
          (err, res, body) => {
            if (err) throw Error(`peecho sendPdfUrl.peecho.generateSecret.request.post: ${err}`);
            console.log(`Pdfurl Send to peecho order:${orderObj.peechoOrderId}, order id:${orderObj._id}`);
            callback(res);
          }
        );
      });
  },
};
