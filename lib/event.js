const async = require('async');
const Event = require('../models/events.js');

const event = module.exports = {
  eventByArrayEventId: (eventList, callback) => {
    Event.find({ _id: eventList }, (err, eventObj) => {
      if (err) throw Error(`Error in event EventByArrayEventId.Event.find: ${err}`);

      callback(eventObj);
    });
  },
};
