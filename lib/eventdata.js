const async = require('async');
const EventData = require('../models/eventdata.js');
const event = require('./event.js');
const User = require('../models/users');

const eventData = module.exports = {
  findByEventID: (eventId, callback) => {
    EventData.findOne({ eventid: eventId }, (err, eventDataObject) => {
      if (err) throw Error(`Error in findOne eventData.findByEventID: ${err}`);

      callback(eventDataObject);
    });
  },
  addSenderIdToJoinUsers: (eventId, senderId, callback) => {
    EventData.update({ eventid: eventId }, { $push: { join_users: senderId } },
      (err) => {
        if (err) throw Error(`Error in findOne eventData.addSenderIdToJoinUsers.EventData.update: ${err}`);

        const conText = {
          joinEventId: eventId,
          verified: true,
        };
        User.update({ userid: senderId }, { $set: { context: conText } }, (err) => {
          if (err) throw Error(`Error in eventData.addSenderIdToJoinUsers.User.update: ${err}`);

          console.log('update user context:', senderId);
          callback();
        });
      });
  },
  updateAttach: (eventDataObj, callback) => {
    EventData.findOneAndUpdate(
      { _id: eventDataObj._id },
      { $set: { attach_to_validate: eventDataObj.attach_to_validate,
        valide_attach: eventDataObj.valide_attach,
        not_valide_attach: eventDataObj.not_valide_attach },
      }
    ).exec()
    .catch((err) => { throw Error(`Error in eventData.updateAttach.findOneAndUpdate: ${err}`); })
    .then(callback());
  },
  printListBySenderID: (senderId, callbackfinal) => {
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
                if (err) throw Error(`Error in eventData printListBySenderID.eventPro.EventData.find.async.each: ${err}`);

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
                if (err) throw Error(`Error in eventData printListBySenderID.eventPar.EventData.find.async.each: ${err}`);

                callback(null, listEvent.eventParArray);
              }
            );
          }
        });
      },
    }, (err, results) => {
      if (err) throw Error(`Error in eventData printListBySenderID.async.parallel.results: ${err}`);

      event.eventByArrayEventId(results.eventPro, (eventProObjectList) => {
        const finalresult = {
          eventPro: {},
          eventPar: {},
        };
        finalresult.eventPro = eventProObjectList;
        event.eventByArrayEventId(results.eventPar, (eventParObjectList) => {
          finalresult.eventPar = eventParObjectList;
          callbackfinal(finalresult);
        });
      });
    });
  },
};
