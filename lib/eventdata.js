const EventData = require('../models/eventdata');

const eventData = {
  findByEventID: (eventId, callback) => {
    EventData.findOne({ eventid: eventId }, (err, eventDataObject) => {
      if (err) throw Error(`Error in findOne eventData.findByEventID: ${err}`);

      callback(eventDataObject);
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
};

module.exports = eventData;
