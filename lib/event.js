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
  eventSearchByName: (searchString, callback) => {
    Event.find({ $text: { $search: searchString } }, { score: { $meta: "textScore" } })
    .sort({ score: { $meta: 'textScore' } })
    .limit(5)
    .exec((err, eventObj) => {
      if (err) throw Error(`Error in event.eventSearchByName.find: ${err}`);

      callback(eventObj);
    });
  },
};
