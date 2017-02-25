const messenger = require('./message.js');
const Event = require('../models/events.js');
const User = require('../models/users.js');
const async = require('async');


const event = module.exports = {
  eventByArrayEventId: (eventList, callback) => {
    Event.find({ _id: { $in: eventList } }, (err, eventObj) => {
      if (err) throw Error(`event.EventByArrayEventId.Event.find: ${err}`);

      callback(eventObj);
    });
  },
  eventByEventId: (eventId, callback) => {
    Event.findOne({ _id: eventId }, (err, eventObj) => {
      if (err) throw Error(`event.eventByEventId findOne: ${err}`);

      callback(eventObj);
    });
  },
  eventSearchByName: (searchString, callback) => {
    Event.find({ $text: { $search: searchString } }, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(5)
    .exec((err, eventObj) => {
      if (err) throw Error(`event.eventSearchByName.find: ${err}`);

      if (eventObj.length >= 1) {
        callback(eventObj);
      } else {
        callback(null);
      }
    });
  },
  findByEventID: (eventId, callback) => {
    Event.findOne({ _id: eventId }, (err, eventDataObject) => {
      if (err) throw Error(`event.findByEventID.findOne: ${err}`);

      callback(eventDataObject);
    });
  },
  addSenderIdToJoinUsers: (eventId, senderId, callback) => {
    Event.update({ _id: eventId }, { $push: { join_users: senderId } },
      (err) => {
        if (err) throw Error(`event.addSenderIdToJoinUsers.Event.update: ${err}`);

        const conText = {
          joinEventId: eventId,
          verified: true,
        };
        User.update({ senderid: senderId }, { $set: { context: conText } }, (err) => {
          if (err) throw Error(`event.addSenderIdToJoinUsers.User.update: ${err}`);

          callback();
        });
      }
    );
  },
  addAttachToValidate: (attachObject, callback) => {
    Event.findOneAndUpdate(
      { _id: attachObject.eventid },
      { $push: { attach_to_validate: attachObject._id } }
    ).exec()
    .catch((err) => { throw Error(`event.addAttachToValidate.Event.findOneAndUpdate: ${err}`); })
    .then(callback());
  },
  updateAttach: (eventObj, callback) => {
    Event.findOneAndUpdate(
      { _id: eventObj._id },
      { $set: { attach_to_validate: eventObj.attach_to_validate,
        valide_attach: eventObj.valide_attach,
        not_valide_attach: eventObj.not_valide_attach },
      }
    ).exec()
    .catch((err) => { throw Error(`event.updateAttach.Event.findOneAndUpdate: ${err}`); })
    .then(callback());
  },
  clotureEvent: (eventId, printId, callback) => {
    Event.findOneAndUpdate(
      { _id: eventId },
      { $set: { event_cloture: true,
        event_printId: printId },
      }
    ).exec()
    .catch((err) => { throw Error(`event.updateAttach.Event.findOneAndUpdate: ${err}`); })
    .then(callback());
  },
  checkCloture: (eventId, callback) => {
    Event.findOne({ _id: eventId }, (err, eventObj) => {
      if (err) throw Error(`event.eventByEventId findOne: ${err}`);

      callback(eventObj);
    });
  },
  afterCloture: (eventId, callback) => {
    console.log('event.afterCloture Starting!');
    User.find({ next_payload: 'SENDTO_EVENT', 'context.joinEventId': eventId },
      (err, userObjs) => {
        if (err) throw Error(`event afterCloture.User.find: ${err}`);

        callback(userObjs);
      }
    );
  },
  checkIfModerator: (senderId, eventId, callback) => {
    Event.findOne({ _id: eventId, moderators: { $eq: senderId } },
      (err, doc) => {
        if (err) throw Error(`event checkIfModerator.Event.findOne: ${err}`);

        callback(doc);
      });
  },
};
