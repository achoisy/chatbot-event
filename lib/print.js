const Print = require('../models/prints.js');
const attach = require('./attach.js');
const EventData = require('../models/eventdata.js');
const event = require('./event.js');
const async = require('async');

const print = module.exports = {
  addNew: (eventId, callback) => {
    event.eventByEventId(eventId, (eventObj) => {
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
            let isPrintable = 'peecho-btn-disabled';
            if (attachObj.length >= 14) {
              isPrintable = 'peecho-btn-okay';
            }
            const newPrint = new Print({
              pdfWidth: 210,
              pdfHeight: 297,
              photoCount: attachObj.length,
              pageCount: 2 + attachObj.length,
              photoList: photoArray,
              printable: isPrintable,
              eventId: eventObj._id,
              event_info: eventObj.event_info,
              welcome_msg: eventObj.welcome_msg,
            });
            newPrint.save((err, printObj) => {
              if (err) throw Error(`Error in print newPrint.save: ${err}`);

              callback(printObj);
            });
          });
        }
      });
    });
  },
  listBySenderId: (senderId, callbackfinal) => {
    const listEvent = {
      eventProArray: [],
      eventParArray: [],
    };
    async.parallel({
      eventPro: (callback) => {
        EventData.find({ moderators: senderId }, (err, listEventObj) => {
          if (listEventObj) {
            async.each(listEventObj,
              (eventObj, callback1) => {
                listEvent.eventProArray.push(eventObj.eventid);
                callback1();
              },
              (err) => {
                if (err) throw Error(`Error in print printListBySenderID.eventPro.EventData.find.async.each: ${err}`);

                callback(null, listEvent.eventProArray);
              }
            );
          }
        });
      },
      eventPar: (callback) => {
        EventData.find({ $and:
        [
          { join_users: senderId },
          { moderators: { $ne: senderId } },
        ] }, (err, listEventObj2) => {
          if (listEventObj2) {
            async.each(listEventObj2,
              (eventObj, callback1) => {
                listEvent.eventParArray.push(eventObj.eventid);
                callback1();
              },
              (err) => {
                if (err) throw Error(`Error in print printListBySenderID.eventPar.EventData.find.async.each: ${err}`);

                callback(null, listEvent.eventParArray);
              }
            );
          }
        });
      },
    }, (err, results) => {
      if (err) throw Error(`Error in print printListBySenderID.async.parallel.results: ${err}`);

      async.parallel({
        eventProFinal: (callback) => {
          const printList = [];
          async.each(results.eventPro, (eventId, callback) => {
            print.addNew(eventId, (printObj) => {
              printList.push(printObj);
              callback();
            });
          }, (err) => {
            if (err) throw Error(`Error in print listBySenderId.async.parallel.eventProFinal: ${err}`);

            callback(null, printList);
          });
        },
        eventParFinal: (callback) => {
          const printList = [];
          async.each(results.eventPar, (eventId, callback) => {
            print.addNew(eventId, (printObj) => {
              printList.push(printObj);
              callback();
            });
          }, (err) => {
            if (err) throw Error(`Error in print listBySenderId.async.parallel.eventProFinal: ${err}`);

            callback(null, printList);
          });
        },
      }, (err, resultFinal) => {
        if (err) throw Error(`Error in print printListBySenderID.async.parallel.eventParFinal: ${err}`);

        const finalresult = {
          eventPro: resultFinal.eventProFinal,
          eventPar: resultFinal.eventParFinal,
        };
        callbackfinal(finalresult);
      });
    });
  },
};
