const Print = require('../models/prints.js');
const attach = require('./attach.js');
const async = require('async');


const print = module.exports = {
  addNew: (eventId, callback) => {
    attach.validateListByEventId(eventId, (attachObj) => {
      const photoArray = [];
      if (attachObj) {
        async.each(attachObj, (obj, callback1) => {
          photoArray.push({
            imageId: obj._id,
            full_url: obj.full_url,
            optimiseImageUrl: obj.optimiseImageUrl,
            author_pic: obj.author_pic,
            message: obj.message,
            public_id: obj.public_id,
            width: obj.width,
            height: obj.height,
          });
          callback1();
        }, () => {
          const newPrint = new Print({
            photoCount: attachObj.length,
            pageCount: 2 + attachObj.length,
            photoList: photoArray,
            printable: () => {
              if (attachObj.length >= 14) {
                return true;
              }
              return false;
            },
          });
          newPrint.save((err, printObj) => {
            if (err) throw Error(`Error in print newPrint.save: ${err}`);

            callback(printObj);
          });
        });
      }
    });
  },
};
