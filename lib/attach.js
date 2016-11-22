// Import
const Attach = require('../models/attach');
const EventData = require('../models/eventdata');

const eventData = require('./eventdata.js');


const attach = module.exports = {
  attchFindOneById: (id) => {
    Attach.findOne({ _id: id }, (err, attachObj) => {
      if (err) throw Error(`Error in attach attchFindOneById senderId: ${err}`);
      console.log('execution de attchFindOne:', attachObj);
      return attachObj;
    });
  },
  addNew: (transload, callback) => {
    let fullUrl = '';

    if (transload.results[':original'][0].ssl_url.indexOf('?')) {
      fullUrl = transload.results[':original'][0].ssl_url.split('?', 1)[0];
    } else {
      fullUrl = transload.results[':original'][0].ssl_url;
    }
    const newAttach = new Attach({
      userid: transload.fields.senderid_pic,
      eventid: transload.fields.eventid_pic,
      content_type: 'img',
      full_url: fullUrl,
      thumbnail_url: transload.results.thumb[0].ssl_url,
      message: transload.fields.message_pic,
      meta: transload.results[':original'][0].meta,
    });
    newAttach.save((err, attachObject) => {
      if (err) throw Error(`Error in findOne senderId: ${err}`);

      EventData.findOneAndUpdate(
        { eventid: attachObject.eventid },
        { $push: { attach_to_validate: attachObject._id } }
      ).exec()
      .catch((err) => { throw Error(`Error in findOneAndUpdate AddAtach: ${err}`); })
      .then(callback(attachObject));
    });
  },
  listByEventId: (eventId, callback) => {
    Attach.find({ eventid: eventId }, (err, attachObj) => {
      if (err) throw Error(`Error in find eventGallery: ${err}`);

      if (attachObj) {
        callback(attachObj);
      } else {
        callback(false);
      }
    });
  },
  toValidate: (eventId, callback) => {
    eventData.findByEventID(eventId, (eventDataObject) => {
      if (eventDataObject) {
        Attach.findOne({ _id: eventDataObject.attach_to_validate[0] }, 'userid eventid thumbnail_url message', (err, results) => {
          if (err) throw Error(`Error in find attach.toValidate: ${err}`);

          callback(results);
        });
      } else {
        callback();
      }
    });
  },
  valide: (eventId, attachId, callback) => {
    eventData.findByEventID(eventId, (eventDataObject) => {
      if (eventDataObject) {
        const objIndex = eventDataObject.attach_to_validate.indexOf(attachId);
        if (objIndex >= 0) {
          eventDataObject.attach_to_validate.splice(objIndex, 1);
          console.log('attach_to_validate: ', eventDataObject.attach_to_validate);
        }
        const objIndex2 = eventDataObject.valide_attach.indexOf(attachId);
        if (objIndex2 < 0) {
          eventDataObject.valide_attach.push(attachId);
          console.log('attach_validate: ', eventDataObject.valide_attach);
        }
        eventData.updateAttach(eventDataObject, callback());
      } else {
        callback();
      }
    });
  },
  notValide: (eventId, attachId, callback) => {
    eventData.findByEventID(eventId, (eventDataObject) => {
      if (eventDataObject) {
        const objIndex = eventDataObject.attach_to_validate.indexOf(attachId);
        if (objIndex >= 0) {
          eventDataObject.attach_to_validate.splice(objIndex, 1);
        }
        const objIndex2 = eventDataObject.not_valide_attach.indexOf(attachId);
        if (objIndex2 < 0) {
          eventDataObject.not_valide_attach.push(attachId);
        }
        eventData.updateAttach(eventDataObject, callback());
      } else {
        callback();
      }
    });
  },
};
