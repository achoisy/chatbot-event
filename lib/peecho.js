const CryptoJS = require('crypto-js');


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
    const buildData = peechoId + merchantId + pdfurl;
    const genSecret = CryptoJS.HmacSHA1(buildData, process.env.PEECHO_SECRET_KEY)
    .toString(CryptoJS.enc.Base64);

    callback(genSecret);
  },
};
