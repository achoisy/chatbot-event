// Import
const Attach = require('../models/attach');
const EventData = require('../models/eventdata');
const moment = require('moment');
const eventData = require('./eventdata.js');
const user = require('./user.js');

moment.locale('fr'); // 'fr'

const attach = module.exports = {
  attchFindOneById: (id, callback) => {
    Attach.findOne({ _id: id }, (err, attachObj) => {
      if (err) throw Error(`attach.attchFindOneById.Attach.findOne: ${err}`);

      if (attachObj) {
        callback(attachObj);
      } else {
        callback(false);
      }
    });
  },
  addNew: (req, callback) => {
    const transload = JSON.parse(req.body.uploadresult);
    console.log(`Date: ${transload.image_metadata.DateTimeOriginal}`);
    if (!transload || !transload.image_metadata.DateTimeOriginal) {
      callback(false);
    } else {
      user.findOneBySenderID(req.body.senderid, (userObj) => {
        const newAttach = new Attach({
          userid: req.body.senderid,
          eventid: req.body.eventid,
          content_type: 'img',
          full_url: transload.secure_url,
          thumbnail_url: transload.eager[0].secure_url,
          author_pic: userObj.user_profile.profile_public_id,
          user_profile: userObj.user_profile,
          message: req.body.usermessage,
          public_id: transload.public_id,
          version: transload.version,
          signature: transload.signature,
          width: transload.width,
          height: transload.height,
          format: transload.format,
          resource_type: transload.resource_type,
          tags: transload.tags,
          bytes: transload.bytes,
          path: transload.path,
          dateTimeOriginal: moment(transload.image_metadata.DateTimeOriginal, "YYYY:MM:DD HH:mm:ss").toISOString(),
          model: transload.image_metadata.Model,
          make: transload.image_metadata.Make,
          orientation: transload.image_metadata.Orientation,
          meta: transload.image_metadata,
        });
        newAttach.save((err, attachObject) => {
          if (err) throw Error(`attach.addNew.user.findOneBySenderID.newAttach.save: ${err}`);

          EventData.findOneAndUpdate(
            { eventid: attachObject.eventid },
            { $push: { attach_to_validate: attachObject._id } }
          ).exec()
          .catch((err) => { throw Error(`attach.addNew.user.findOneBySenderID.newAttach.save.findOneAndUpdate.AddAtach: ${err}`); })
          .then(callback(attachObject));
        });
      });
    }
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
  validateListByEventId: (eventId, callback) => {
    eventData.findByEventID(eventId, (eventDataObject) => {
      if (eventDataObject) {
        Attach.find({ _id: { $in: eventDataObject.valide_attach } }, null, { sort: 'dateTimeOriginal' }, (err, attachObj) => {
          if (err) throw Error(`Error in attach validateListByEventId Attach.find: ${err}`);

          if (attachObj) {
            callback(attachObj);
          } else {
            callback(false);
          }
        });
      } else {
        callback(false);
      }
    });
  },
  toValidate: (eventId, callback) => {
    eventData.findByEventID(eventId, (eventDataObject) => {
      if (eventDataObject) {
        Attach.findOne({ _id: eventDataObject.attach_to_validate[0] }, (err, results) => {
          if (err) throw Error(`Error in find attach.toValidate: ${err}`);

          callback(results);
        });
      } else {
        callback(false);
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
        eventData.updateAttach(eventDataObject, callback);
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
        eventData.updateAttach(eventDataObject, callback);
      } else {
        callback();
      }
    });
  },
};
