// Import
const Attach = require('../models/attach');
const EventData = require('../models/eventdata');
const moment = require('moment');
const eventData = require('./eventdata.js');
const user = require('./user.js');
const fs = require('fs');
const request = require('request');
const tmp = require('tmp');

moment.locale('fr'); // 'fr'

function cloudinaryToFile(uri, imgTmpFile, callback) {
  console.log('Starting stream');
  const stream = request(uri).pipe(fs.createWriteStream(imgTmpFile));
  stream.on('finish', () => {
    console.log('Stream finish');
    callback();
  });
}

const attach = module.exports = {
  attchFindOneById: (attachId, callback) => {
    Attach.findOne({ _id: attachId }, (err, attachObj) => {
      if (err) throw Error(`Error in attach attchFindOneById senderId: ${err}`);

      if (attachObj) {
        callback(attachObj);
      } else {
        callback(null);
      }
    });
  },
  addNew: (req, callback) => {
    const transload = JSON.parse(req.body.uploadresult);
    user.findOneBySenderID(req.body.senderid, (userObj) => {
      // Deals with thumbnail_img ==> store it in mongoDb due to messenger whitelist errores
      tmp.file({ postfix: '.png' }, (err, imgTmpFile, fd) => {
        if (err) throw Error(`attach.addNew.user.findOneBySenderID.tmp.file: ${err}`);

        cloudinaryToFile(transload.eager[0].secure_url, imgTmpFile, () => {
          // Create new attach
          const newAttach = new Attach({
            userid: req.body.senderid,
            eventid: req.body.eventid,
            content_type: 'img',
            full_url: transload.secure_url,
            thumbnail_url: transload.eager[0].secure_url,
            thumbnail_img: {
              data: imgTmpFile,
              contentType: 'image/png',
            },
            author_pic: userObj.user_profile.profile_pic,
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
            if (err) throw Error(`Error in attach newAttach.save: ${err}`);

            EventData.findOneAndUpdate(
              { eventid: attachObject.eventid },
              { $push: { attach_to_validate: attachObject._id } }
            ).exec()
            .catch((err) => { throw Error(`Error in findOneAndUpdate AddAtach: ${err}`); })
            .then(callback(attachObject));
          });
        });
      });
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
