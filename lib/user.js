const User = require('../models/users.js');

const user = module.exports = {
  findOneBySenderID: (senderId, callback) => {
    User.findOne({ senderid: senderId }, (err, userObj) => {
      if (err) throw Error(`Error in user findOneBySenderID findOne: ${err}`);

      callback(userObj);
    });
  },
};
