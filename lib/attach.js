// Import
const Attach = require('../models/attach');
const moment = require('moment');
const user = require('./user.js');
const event = require('./event.js');
const async = require('async');

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
    let pictureDate = "";
    if (!transload) {
      callback(false);
    } else {
      if (!transload.image_metadata.DateTimeOriginal) {
        pictureDate = new Date();
      } else {
        pictureDate = moment(transload.image_metadata.DateTimeOriginal, "YYYY:MM:DD HH:mm:ss").toISOString();
      }
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
          dateTimeOriginal: pictureDate,
          model: transload.image_metadata.Model,
          make: transload.image_metadata.Make,
          orientation: transload.image_metadata.Orientation,
          meta: transload.image_metadata,
        });
        newAttach.save((err, attachObject) => {
          if (err) throw Error(`attach.addNew.user.findOneBySenderID.newAttach.save: ${err}`);

          event.addAttachToValidate(attachObject, () => {
            callback(attachObject);
          });
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
    event.findByEventID(eventId, (eventObject) => {
      if (eventObject) {
        Attach.find({ _id: { $in: eventObject.valide_attach } }, null, { sort: 'dateTimeOriginal' }, (err, attachObj) => {
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
  validateListByArray: (photoArray, callback) => {
    const attachs = [];
    async.eachSeries(photoArray, (photoId, callback) => {
      Attach.findOne({ _id: photoId }, (err, attachObj) => {
        if (err) throw Error(`attach.attchFindOneById.Attach.findOne: ${err}`);

        if (attachObj) {
          attachs.push(attachObj);
          callback();
        } else {
          callback("No attach found");
        }
      });
    }, (err) => {
      if (err) throw Error(`Error in attach validateListByEventId Attach.find: ${err}`);

      callback(attachs);
    });
  },
  toValidate: (eventId, callback) => {
    event.findByEventID(eventId, (eventObject) => {
      if (eventObject) {
        Attach.findOne({ _id: eventObject.attach_to_validate[0] }, (err, results) => {
          if (err) throw Error(`Error in find attach.toValidate: ${err}`);

          callback(results);
        });
      } else {
        callback(false);
      }
    });
  },
  valide: (eventId, attachId, callback) => {
    event.findByEventID(eventId, (eventObject) => {
      if (eventObject) {
        const objIndex = eventObject.attach_to_validate.indexOf(attachId);
        if (objIndex >= 0) {
          eventObject.attach_to_validate.splice(objIndex, 1);
          console.log('attach_to_validate: ', eventObject.attach_to_validate);
        }
        const objIndex2 = eventObject.valide_attach.indexOf(attachId);
        if (objIndex2 < 0) {
          eventObject.valide_attach.push(attachId);
          console.log('attach_validate: ', eventObject.valide_attach);
        }
        event.updateAttach(eventObject, callback);
      } else {
        callback();
      }
    });
  },
  notValide: (eventId, attachId, callback) => {
    event.findByEventID(eventId, (eventObject) => {
      if (eventObject) {
        const objIndex = eventObject.attach_to_validate.indexOf(attachId);
        if (objIndex >= 0) {
          eventObject.attach_to_validate.splice(objIndex, 1);
        }
        const objIndex2 = eventObject.not_valide_attach.indexOf(attachId);
        if (objIndex2 < 0) {
          eventObject.not_valide_attach.push(attachId);
        }
        event.updateAttach(eventObject, callback);
      } else {
        callback();
      }
    });
  },
};
