const msg = require('./message.js');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const speakeasy = require('speakeasy'); // Two factor authentication
const PNF = require('google-libphonenumber').PhoneNumberFormat;  // Require `PhoneNumberFormat`.
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();  // Get an instance of `PhoneNumberUtil`.
const cloudinary = require('cloudinary').v2;

// Model for mongoose schema
const User = require('../models/users');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const mobile = module.exports = {
  request: (senderId) => {   // Ask for mobile number
    User.findOneAndUpdate(
      { senderid: senderId },
      { $set: { 'user_mobile.mobile_number': '' } },
      (err) => {
        if (err) throw Error(`Error in findOneAndUpdate mobile.request: ${err}`);

        msg.send('Tapez votre numero de Mobile (ex: 0696123456).', senderId);
      }
    );
  },
  addToUser: (message, callback) => {  // Add Mobile number to user profile
    const senderId = message.sender.id;
    const mobileNumber = message.message.quick_reply.payload.split('#', 2)[1];
    console.log(`SenderId ${senderId} Mobile number: ${mobileNumber} `);
    User.findOneAndUpdate(
      { senderid: senderId },
      { $set: { 'user_mobile.mobile_number': mobileNumber, 'user_mobile.verified': false, 'user_mobile.verif_proc': false } },
      (err) => {
        if (err) throw Error(`Error in findOne senderId: ${err}`);

        callback(message);
      });
  },
  smsCodeSend: (senderId, mobileNumber) => {
    const code = speakeasy.totp({
      secret: process.env.SPEAKEASY_SECRET_TOKEN.base32 + senderId,
      encoding: 'base32',
      step: 120,
    });
    console.log(`Two factor code for ${mobileNumber} is ${code}`, 'Sending SMS');
    const smsText = `Code d'invitation Chatbots: ${code} `;
    twilio.messages.create({
      to: mobileNumber,
      from: '+12163524440',
      body: smsText,
    }, (err, message) => {
      console.log(`${mobileNumber} Twilio Message : ${message.sid}`);
      // console.log('Fake twilio message');
      // Save Code in user profile and set verif_proc:true
      User.findOneAndUpdate({ senderid: senderId },
        { $set: { 'user_mobile.verif_proc': true } },
        (err) => {
          if (err) throw Error(`Error in findOneAndUpdate smsCodeSend: ${err}`);

          // request invitation code to user
          msg.send('Tapez le code invitation reçu par SMS', senderId);
        });
    });
  },
  userCheckSMS: (message, callback) => {
    const senderId = message.sender.id;
    User.findOne({ senderid: senderId }, (err, userObj) => {
      if (err) throw Error(`Error in findOne senderId: ${err}`);

      if (userObj) { // User exist
        if (!userObj.user_mobile.mobile_number) {
          let numberValid = false;
          let mobileNumber = '';
          try {
            mobileNumber = phoneUtil.parse(message.message.text.replace(/\D/g, ''), 'FR');
            numberValid = phoneUtil.isValidNumber(mobileNumber);
          } catch (e) {
            console.log('phoneUtil error: ', e);
          }
          if (numberValid) {
            console.log("mobile getNumberType: " + phoneUtil.getNumberType(mobileNumber));
            if (phoneUtil.getNumberType(mobileNumber) !== 1) {
              // Numero n est pas un num mobile
              const userMsg = `Désolé, mais le numéro ${phoneUtil.format(mobileNumber, PNF.NATIONAL)} n'est pas un numéro de mobile`;
              msg.send(userMsg, senderId, () => {
                mobile.request(senderId);
              });
            } else { // Numero mobile valide
              msg.confirmMobile(mobileNumber, senderId);
            }
          } else {
            // Numero non valide
            msg.send(`Désolé, mais le numéro n'est pas valide`, senderId, () => {
              mobile.request(senderId);
            });
          }
        } else if (!userObj.user_mobile.verified) { // User mobile number is not verified
          if (!userObj.user_mobile.verif_proc) { // User need a verif code !
            mobile.smsCodeSend(senderId, userObj.user_mobile.mobile_number);
          } else if ('text' in message.message) { // User should be verifying code here or maybe he have not received the code yet
            const codeToVerify = message.message.text;
            const checkCode = speakeasy.totp.verify({
              secret: process.env.SPEAKEASY_SECRET_TOKEN.base32 + senderId,
              encoding: 'base32',
              token: codeToVerify,
              step: 120,
              window: 10,
            });
            if (!checkCode) { // Code SMS incorrecte
              msg.send(`Désolé, mais le code d'invitation n'est pas valide`, senderId, () => {
                msg.checkIfSMS(senderId);
              });
            } else { // Code SMS OK. rediriger vers le service demandé
              User.findOneAndUpdate(
                { senderid: senderId },
                { $set: { 'user_mobile.verified': true } },
                (err) => {
                  if (err) throw Error(`Error in findOne senderId: ${err}`);

                  callback(message);
                }
              );
            }
          } else { // User should enter SMS code again
            msg.send('Tapez le code invitation reçu par SMS', senderId);
          }
        } else { // User should continu to service requested
          console.log(`userMobileCheck OK for senderId: ${senderId}`);
          callback(message);
        }
      } else {  // User n'existe pas
        msg.getUser(senderId).then((user) => {
          const newUser = new User({
            senderid: senderId,
            user_profile: user,
            next_payload: message.message.quick_reply.payload,
            context: { newuser: true },
          });
          newUser.save((err, userObject) => {
            if (err) throw Error(`mobile.js userCheckSMS.newUser.save: ${err}`);

            msg.send('Ceci est votre 1ère connexion !', senderId, () => {
              this.mobile.request(senderId);
            });
          });
        });
      }
    });
  },
  userCheck: (message, callback) => {
    const senderId = message.sender.id;

    User.findOne({ senderid: senderId }, (err, userObj) => {
      if (err) throw Error(`findOne senderId: ${err}`);

      if (userObj) { // User exist
        if (!userObj.user_profile.profile_public_id) {
          cloudinary.uploader.upload(userObj.user_profile.profile_pic, { timeout: 60000 })
          .then((image) => {
            User.update({ _id: userObj._id }, { $set: { "user_profile.profile_public_id": image.public_id } })
            .exec();
          })
          .catch((err) => {
            if (err) throw Error(`userCheck.cloudinary.uploader.re-upload: ${err}`);
          });
        }
        console.log(`userCheck completed for senderid:${senderId}`);
        callback(message);
      } else {  // User n'existe pas
        let nextPlayload = "";
        if (!message.postback.payload) {
          nextPlayload = "DEFAULT";
        } else {
          nextPlayload = message.postback.payload;
        }
        msg.getUser(senderId).then((user) => {
          const newUser = new User({
            senderid: senderId,
            user_profile: user,
            // next_payload: message.message.quick_reply.payload,
            next_payload: nextPlayload,
            context: { newuser: true },
          });
          newUser.save((err, updateUser) => {
            if (err) throw Error(`userCheck.newUser.save: ${err}`);

            console.log(`New user created senderId: ${senderId} ${updateUser.user_profile.first_name} ${updateUser.user_profile.last_name} `);
            msg.send('Ceci est votre 1ère connexion ! Bienvenue.', senderId, () => {
              cloudinary.uploader.upload(user.profile_pic, { timeout: 60000 })
              .then((image) => {
                User.update({ _id: updateUser._id }, { $set: { "user_profile.profile_public_id": image.public_id } })
                .exec();
              })
              .catch((err) => {
                if (err) throw Error(`userCheck.cloudinary.uploader.upload: ${err}`);
              });
              callback(message);
            });
          });
        });
      }
    });
  },
};
