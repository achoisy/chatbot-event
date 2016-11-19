const EventData = require('../models/eventdata');

const eventData = {
  findByEventID: (eventId, callback) => {
    EventData.findOne({ eventid: eventId }, (err, eventDataObject) => {
      if (err) throw Error(`Error in findOne eventData.findByEventID: ${err}`);

      callback(eventDataObject);
    });
  },
};

module.exports = eventData;
