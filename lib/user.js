const User = require('../models/users.js');

const user = module.exports = {
  findOneBySenderID: (senderId, callback) => {
    User.findOne({ senderid: senderId }, (err, userObj) => {
      if (err) throw Error(`Error in user findOneBySenderID findOne: ${err}`);

      callback(userObj);
    });
  },
  getContext: (senderId, callback) => {
    User.findOne({ senderid: senderId }, (err, userObj) => {
      if (err) throw Error(`Error in user.getContextBySenderID: ${err}`);

      if (typeof callback === 'function') {
        if (userObj && 'context' in userObj) {
          callback(userObj.context);
        } else {
          callback();
        }
      }
    });
  },
  updateContext: (senderId, conText, callback) => {
    User.findOneAndUpdate({ senderid: senderId },
      { $set: { context: conText } },
      (err) => {
        if (err) throw Error(`Error in findOneAndUpdate updateContext: ${err}`);

        if (typeof callback === 'function') {
          callback();
        }
      }
    );
  },
  addCoverToContext: (req, callback) => {
    user.getContext(req.body.senderid, (context) => {
      const userContext = context;
      const transload = JSON.parse(req.body.uploadresult);
      userContext.welcome_msg.texte = req.body.usermessage;
      userContext.welcome_msg.photo = transload;
      userContext.welcome_msg.photo.thumbnail_url = transload.eager[0].secure_url;
      userContext.welcome_msg.cover_public_id = transload.public_id;
      user.updateContext(req.body.senderid, userContext, () => {
        callback(userContext);
      });
    });
  },
  testNextpayload: (senderId, payloadToTest, callback) => {
    User.findOne({ senderid: senderId }, (err, userObj) => {
      if (err) throw Error(`user.testNextpayload.User.findOne: ${err}`);

      if (userObj && 'next_payload' in userObj) {
        if (userObj.next_payload === payloadToTest) {
          callback(true);
        } else {
          callback(false);
        }
      } else {
        callback(false);
      }
    });
  },
};
