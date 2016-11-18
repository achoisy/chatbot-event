const EventData = require('../models/eventdata');

const eventData = {
  findByEventID: (eventId) => {
    EventData.findOne({ eventid: eventId }, (err, eventDataObject) => {
      if (err) throw Error(`Error in findOne eventData.findByEventID: ${err}`);

      return eventDataObject;
    });
  },
};

module.exports = eventData;
