const async = require('async');
const Event = require('../models/events.js');

const event = module.exports = {
  eventByArrayEventId: (eventList, callback) => {
    Event.find({ _id: { $in: eventList } }, (err, eventObj) => {
      if (err) throw Error(`Error in event EventByArrayEventId.Event.find: ${err}`);

      callback(eventObj);
    });
  },
  eventByEventId: (eventId, callback) => {
    Event.findOne({ _id: eventId }, (err, eventObj) => {
      if (err) throw Error(`Error in event eventByEventId findOne: ${err}`);

      callback(eventObj);
    });
  },
};
