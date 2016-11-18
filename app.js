// Import
const dotenv = require('dotenv');
// Config files load
dotenv.config({ silent: true });
// Import
const express = require('express');
const bodyParser = require('body-parser');
const fb = require('fbmessenger');
const mongoose = require('mongoose');
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const speakeasy = require('speakeasy'); // Two factor authentication
const path = require('path');
const moment = require('moment');
const exphbs = require('express-handlebars');
const TransloaditClient = require('transloadit');

// Model for mongoose schema
const User = require('./models/users');
const Event = require('./models/events');
const EventData = require('./models/eventdata');
const UserData = require('./models/userdata');
const Attach = require('./models/attach');

moment.locale('fr'); // 'fr'

// google phone checker
// Require `PhoneNumberFormat`.
const PNF = require('google-libphonenumber').PhoneNumberFormat;
// Get an instance of `PhoneNumberUtil`.
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

// Compose.io Mongo url
const mongodbUrl = process.env.MONGODB_CONNECT;
mongoose.Promise = global.Promise;
mongoose.connect(mongodbUrl);

// transloadit connection
const transloadit = new TransloaditClient({
  authKey: process.env.TRANSLOADIT_AUTH_KEY,
  authSecret: process.env.TRANSLOADIT_AUTH_SECRET,
});

// web page setup
const sslRootUrl = process.env.WEB_ADRESSE;
const sslWebUrl = `${sslRootUrl}/messenger`;

// AWS S3 bucket credit
const s3Bucket = {
  authKey: process.env.AWS_S3_ACCOUNT_ID,
  authSecret: process.env.AWS_S3_AUTH_SECRET,
  bucketName: process.env.AWS_S3_BUCKET_NAME,
};

// Express wrap
const app = express();

// app.use(express.static('public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Configuration du webhook facebook
const messenger = new fb.Messenger({
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
});

// Liste d'url accessible
const WHITELISTED_DOMAINS = [
  'http://chatbotsmaker.fr',
  sslRootUrl,
];
// console.log('Debug: ', JSON.stringify(res));
//-------------------------------------------------------------------------------------------------
// Bot Initialisation and configuration
//-------------------------------------------------------------------------------------------------

// TODO: Separation de l'initialisation du BOT.
// Initialisation du bot
function botInit() {
  messenger.addWhitelistedDomains(WHITELISTED_DOMAINS);

  // Text Page d'accueil
  const greetingText = new fb.GreetingText(`Organisateur ou Invité, centralisez les photos, vidéos et commentaires durant vos événements`);
  messenger.setThreadSetting(greetingText)
        .then((result) => {
          console.log(`Greeting Text: ${JSON.stringify(result)}`);
        })
        .catch((err) => {
          console.log('Error in greetingText:', err);
        });

  // Boutton Get started
  const getStarted = new fb.GetStartedButton('start');
  messenger.setThreadSetting(getStarted)
        .then((result) => {
          console.log(`Greeting Text: ${JSON.stringify(result)}`);
        })
        .catch((err) => {
          console.log('Error in getStarted', err);
        });

    // Menu persistant
  const menu_help = new fb.PersistentMenuItem({
    type: 'postback',
    title: 'Aide',
    payload: 'help',
  });

    // Menu persistant
  const menu_start = new fb.PersistentMenuItem({
    type: 'postback',
    title: 'Demarrer',
    payload: 'DEFAULT',
  });

  const menu_blog = new fb.PersistentMenuItem({
    type: 'web_url',
    title: 'Nous contacter',
    url: 'http://chatbotsmaker.fr',
    // webview_height_ratio: 'full',
  });

  const menu = new fb.PersistentMenu([menu_start,menu_help, menu_blog]);
  messenger.setThreadSetting(menu)
    .then((result) => {
      console.log(`Persistent menu: ${JSON.stringify(result)}`);
    })
    .catch((err) => {
      console.log('Error in persistent menu setup', err);
    });
}

// Remove thread settings
function threadBotRemove() {
  messenger.deleteGreetingText()
        .then((result) => {
          console.log(`Delete Greeting Text: ${JSON.stringify(result)}`);
        })
        .catch((err) => {
          console.log('Error in Deleting greetingText:', err);
        });

  messenger.deleteGetStarted()
        .then((result) => {
          console.log(`Delete start buttons: ${JSON.stringify(result)}`);
        })
        .catch((err) => {
          console.log('Error in Delete start buttons:', err);
        });

  messenger.deletePersistentMenu()
        .then((result) => {
          console.log(`Delete menu: ${JSON.stringify(result)}`);
        })
        .catch((err) => {
          console.log('Error in Delete menu:', err);
        });
}

//--------------------------------------------------------------------------------------------
// General Function
//--------------------------------------------------------------------------------------------

function demarrer() {
  messenger.send(
    new fb.GenericTemplate([
      new fb.Element({
        title: 'Participer à un évènement',
        image_url: `${sslRootUrl}/images/square/join_event.png`,
        subtitle: "Si Vous êtes invités à participer à un évènement",
      }),
      new fb.Element({
        title: 'Organiser un évènement',
        image_url: `${sslRootUrl}/images/square/new_event.png`,
        subtitle: "Si vous organisez ou avez les droits d'administration d'un évènement",
      }),
    ])
  ).then((res) => {
    const demqr1 = new fb.QuickReply({ title: `J'organise`, payload: 'ORGAN_EVENEMENT', image_url: `${sslRootUrl}/images/circle/new_event.png` });
    // const qr2 = new fb.QuickReply({ title: 'MODIFIER', payload: 'MODIF_EVENEMENT'});
    const demqr2 = new fb.QuickReply({ title: 'Je participe', payload: 'PARTI_EVENEMENT', image_url: `${sslRootUrl}/images/circle/join_event.png` });
    const demqrs = new fb.QuickReplies([demqr2, demqr1]);
    messenger.send(Object.assign(
        { text: 'Faites votre choix:' },
        demqrs
      ));
  });
}

function sendMessage(msgText, callback) {
  messenger.send({ text: msgText }).then((res) => {
    console.log(`sending Message: ${JSON.stringify(res)}`);
    if (typeof callback === 'function') {
      callback();
    }
  }).catch((err) => {
    console.error(`Erreur: ${err}`);
  });
}

function setNextPayload(senderId, nextPayload, callback) {
  User.findOneAndUpdate({ senderid: senderId },
    { $set: { next_payload: nextPayload } },
    (err, userObj) => {
      if (err) throw Error(`Error in findOne senderId: ${err}`);

      if (userObj) { // User exist
        console.log(`Next payload for senderId ${senderId} : ${nextPayload} `);
      } else {
        console.log('User not found ! SenderId: ', senderId);
      }
      callback();
    });
}

function updateContext(senderId, conText, callback) {
  User.findOneAndUpdate({ senderid: senderId },
    { $set: { context: conText } },
    (err, userObj) => {
      if (err) throw Error(`Error in findOneAndUpdate updateContext: ${err}`);

      if (typeof callback === 'function') {
        callback();
      }
    }
  );
}

function getContext(senderId, callback) {
  User.findOne({ senderid: senderId }, (err, userObj) => {
    if (err) throw Error(`Error in findOne getContext: ${err}`);

    if (typeof callback === 'function') {
      if (userObj && 'context' in userObj) {
        const context = userObj.context;
        console.log('Context: ', JSON.stringify(context));
        callback(userObj.context);
      } else {
        callback();
      }
    }
  });
}

function location(msg) {
  const reply = new fb.QuickReply({ title: 'Localisation', content_type: 'location' });
  const text = new fb.Text(msg);
  const quickReplies = new fb.QuickReplies([reply]);
  const payload = Object.assign(text, quickReplies);

  messenger.send(payload).then((res) => {
    console.log('Debug: ', res);
  });
}

function addAttach(transload, callback) {
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

    callback(attachObject);
  });
}

function eventGallery(eventId, callback) {
  Attach.find({ eventid: eventId }, (err, attachObj) => {
    if (err) throw Error(`Error in find eventGallery: ${err}`);

    if (attachObj) {
      callback(attachObj);
    } else {
      callback(false);
    }
  });
}

function saveImage(imageUrl, callback) {
  const options = {
    params: {
      steps: {
        import: {
          robot: '/http/import',
          url: imageUrl,
        },
        store: {
          use: 'import',
          robot: '/s3/store',
          key: s3Bucket.authKey,
          secret: s3Bucket.authSecret,
          bucket: s3Bucket.bucketName,
          path: '/coverimage/${assembly.id}.${file.ext}',
        },
      },
    },
  };

  transloadit.createAssembly(options, (err, result) => {
    if (err) {
      throw Error(err);
    }
    const imageExt = imageUrl.split('.').pop();

    const pathToImage = `https://s3.amazonaws.com/${s3Bucket.bucketName}/coverimage/${result.assembly_id}.${imageExt}`;
    callback(pathToImage);
  });
}
//--------------------------------------------------------------------------------------------
// MOBILE Function
//--------------------------------------------------------------------------------------------
// Ask for mobile number
function mobileRequest(senderId) {
  User.findOneAndUpdate(
    { senderid: senderId },
    { $set: { 'user_mobile.mobile_number': '' } },
    (err, userObj) => {
      if (err) throw Error(`Error in findOneAndUpdate mobileRequest: ${err}`);

      sendMessage('Tapez votre numero de Mobile (ex: 0696123456).');
    });
}

function confirmMobileNumber(mobileNumber) {
  const conqr1 = new fb.QuickReply({ title: 'Oui', payload: `CONF_MOBILE#${phoneUtil.format(mobileNumber, PNF.E164)}`, image_url: `${sslRootUrl}/images/circle/yes.png` });
  const conqr2 = new fb.QuickReply({ title: 'Non', payload: 'MOBILE_REQUEST', image_url: `${sslRootUrl}/images/circle/no.png` });
  const conqrs = new fb.QuickReplies([conqr1, conqr2]);

  messenger.send(Object.assign(
      { text: `Votre numéro de mobile est bien le ${phoneUtil.format(mobileNumber, PNF.NATIONAL)}` },
      conqrs
    ));
}

function checkIfReceivedSMS(mobileNumber) {
  const cheqr1 = new fb.QuickReply({ title: 'Oui', payload: 'CHECK_SMS_OUI' });
  const cheqr2 = new fb.QuickReply({ title: 'Non', payload: 'CHECK_SMS_NON' });
  const cheqrs = new fb.QuickReplies([cheqr1, cheqr2]);
  messenger.send(Object.assign(
      { text: `Avez-vous reçu le code d'invitation par SMS ?` },
      cheqrs
    ));
}

// Add Mobile number to user profile
function addMobileToUser(message, callback) {
  const senderId = message.sender.id;
  const mobileNumber = message.message.quick_reply.payload.split('#', 2)[1];
  console.log(`SenderId ${senderId} Mobile number: ${mobileNumber} `);
  User.findOneAndUpdate(
    { senderid: senderId },
    { $set: { 'user_mobile.mobile_number': mobileNumber, 'user_mobile.verified': false, 'user_mobile.verif_proc': false } },
    (err, userObj) => {
      if (err) throw Error(`Error in findOne senderId: ${err}`);
      callback(message);
    });
}

function validateUser(senderId) {
  console.log(`Mobile number validate for SenderId: ${senderId} `);
  User.findOneAndUpdate(
    { senderid: senderId },
    { $set: { 'user_mobile.verified': true } },
    (err, userObj) => {
      if (err) throw Error(`Error in findOne senderId: ${err}`);
    });
}

function smsCodeSend(senderId, mobileNumber) {
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
      (err, userObj) => {
        if (err) throw Error(`Error in findOneAndUpdate smsCodeSend: ${err}`);

        // request invitation code to user
        sendMessage('Tapez le code invitation reçu par SMS');
      });
  });
}

function userMobileCheck(message, callback) {
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
            sendMessage(userMsg, () => {
              mobileRequest(senderId);
            });
          } else { // Numero mobile valide
            confirmMobileNumber(mobileNumber);
          }
        } else {
          // Numero non valide
          sendMessage(`Désolé, mais le numéro n'est pas valide`, () => {
            mobileRequest(senderId);
          });
        }
      } else if (!userObj.user_mobile.verified) { // User mobile number is not verified
        if (!userObj.user_mobile.verif_proc) { // User need a verif code !
          smsCodeSend(senderId, userObj.user_mobile.mobile_number);
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
            sendMessage(`Désolé, mais le code d'invitation n'est pas valide`, () => {
              checkIfReceivedSMS(userObj.user_mobile.mobile_number);
            });
          } else { // Code SMS OK. rediriger vers le service demandé
            validateUser(senderId);
            callback(message);
          }
        } else { // User should enter SMS code again
          sendMessage('Tapez le code invitation reçu par SMS');
        }
      } else { // User should continu to service requested
        console.log(`userMobileCheck OK for senderId: ${senderId}`);
        callback(message);
      }
    } else {  // User n'existe pas
      messenger.getUser().then((user) => {
        const newUser = new User({
          senderid: senderId,
          user_profile: user,
          next_payload: message.message.quick_reply.payload,
          context: { newuser: true },
        });
        newUser.save((err, userObject) => {
          if (err) {
            console.log('Error: ', err);
          } else {
            const newUserData = new UserData({
              userid: userObject.id,
            });
            newUserData.save((err) => {
              if (err) {
                console.log('Error: ', err);
              } else {
                console.log(`New user admin created senderId: ${senderId}`);
                sendMessage('Ceci est votre 1er connexion !', () => {
                  mobileRequest(senderId);
                });
              }
            });
          }
        });
      });
    }
  });
}

function userCheck(message, callback) {
  const senderId = message.sender.id;
  User.findOne({ senderid: senderId }, (err, userObj) => {
    if (err) throw Error(`Error in findOne senderId: ${err}`);

    if (userObj) { // User exist
      callback(message);
    } else {  // User n'existe pas
      messenger.getUser().then((user) => {
        const newUser = new User({
          senderid: senderId,
          user_profile: user,
          next_payload: message.message.quick_reply.payload,
          context: { newuser: true },
        });
        newUser.save((err, userObject) => {
          if (err) throw Error(`Error in userCheck: ${err}`);

          console.log(`New user regular created senderId: ${senderId}`);
          sendMessage('Ceci est votre 1er connexion ! Bienvenu.', () => {
            callback(message);
          });
        });
      });
    }
  });
}
//--------------------------------------------------------------------------------------------
// ORGANISATION Function
//--------------------------------------------------------------------------------------------
function choiceOrganis() {
  messenger.send(
    new fb.GenericTemplate([
      new fb.Element({
        title: 'Creer évènement',
        image_url: `${sslRootUrl}/images/square/add_event.png`,
        subtitle: 'Créez votre nouvelle évènement et centralisez les photos, vidéos et commentaires de vos évènements',
      }),
    ])
  ).then((res) => {
    const eventqr1 = new fb.QuickReply({ title: 'Créer évènement', payload: 'NEW_EVENT', image_url: `${sslRootUrl}/images/circle/add_event.png` });
    const eventqr2 = new fb.QuickReply({ title: 'Annuler', payload: 'DEFAULT', image_url: `${sslRootUrl}/images/circle/cancel.png` });
    const eventqrs = new fb.QuickReplies([eventqr1, eventqr2]);

    messenger.send(Object.assign(
        { text: 'Faites votre choix:' },
        eventqrs
      ));
  });
}

function choiceAddEventMessage() {
  const addEventqr1 = new fb.QuickReply({
    title: 'Ajouter',
    payload: 'ADD_EVENT',
    image_url: `${sslRootUrl}/images/circle/add_event.png`,
  });
  const addEventqr2 = new fb.QuickReply({
    title: 'Terminer',
    payload: 'RECAP_EVENT',
    image_url: `${sslRootUrl}/images/circle/validate.png`,
  });
  const addEventqr = new fb.QuickReplies([addEventqr1, addEventqr2]);
  messenger.send(Object.assign(
    { text: 'Vous pouvez ajouter un message de bienvenu: text, image, photo et video' },
    addEventqr
  )).catch((err) => {
    if (err) throw Error('Error choiceAddEventMessage', err);
  });
}

function createNewEvent(message, callback) {
  const senderId = message.sender.id;
  User.findOne({ senderid: senderId }, (err, userObj) => {
    if (err) throw Error(`Error in findOne senderId: ${err}`);

    if (userObj) {
      let context = {};

      if (userObj.context) {
        context = userObj.context;
      }

      // Start context filling
      if ('event_info' in context && 'welcome_msg' in context) {
        if (!context.event_info.name) {
          context.event_info.name = message.message.text;
          updateContext(senderId, context, () => {
            sendMessage('Donner une brève description de votre évènement');
          });
        } else if (!context.event_info.description) {
          context.event_info.description = message.message.text;
          updateContext(senderId, context, () => {
            choiceAddEventMessage();
          });
        } else if ('quick_reply' in message.message) {
          // DO NOTHING !!! :)
        } else {
          if ('text' in message.message) {
            context.welcome_msg.texte = message.message.text;
          }
          if ('attachments' in message.message) {
            switch (message.message.attachments[0].type) {
              case 'image':
                context.welcome_msg.photo = message.message.attachments[0].payload.url;
                break;
              case 'audio':
                context.welcome_msg.audio = message.message.attachments[0].payload.url;
                break;
              case 'video':
                context.welcome_msg.video = message.message.attachments[0].payload.url;
                break;
              default:
                messenger.send({ text: 'Fichier joint non compatible...' });
            }
          }

          updateContext(senderId, context, () => {
            sendMessage('Bien reçu...', () => {
              choiceAddEventMessage();
            });
          });
        }
      } else {
        context.event_info = {
          name: '',
          description: '',
          start_date: '',
          end_date: '',
          location: '',
        };
        context.welcome_msg = {
          photo: '',
          video: '',
          texte: '',
          audio: '',
        };
        context.validate = false;

        updateContext(senderId, context, () => {
          messenger.send({ text: 'Quel est le nom de votre évènement ?' });
        });
      }
    } else {
      throw Error(`Error in findOne userObj sender ID: ${senderId}`);
    }
  });
}

function recapEvent(message, callback) {
  const senderId = message.sender.id;
  User.findOne({ senderid: senderId }, (err, userObj) => {
    if (err) throw Error(`Error in findOne senderId: ${err}`);

    if ('context' in userObj) {
      const context = userObj.context;
      let recapEventText = 'Voici le récapitulatif de votre nouvel évènement:\n';
      recapEventText += `   • Nom: ${context.event_info.name}\n`;
      recapEventText += `   • Description: ${context.event_info.description}\n`;

      const buttonsArray = [];
      if (userObj.context.welcome_msg.video !== '') {
        buttonsArray.push(
          new fb.Button({
            type: 'web_url',
            title: 'Message video',
            url: userObj.context.welcome_msg.video,
          })
        );
      }
      if (userObj.context.welcome_msg.audio !== '') {
        buttonsArray.push(
          new fb.Button({
            type: 'web_url',
            title: 'Message audio',
            url: userObj.context.welcome_msg.audio,
          })
        );
      }
      messenger.send({ text: recapEventText }).then(() => {
        // console.log('Debug: ', JSON.stringify(res));
        messenger.send(
          new fb.GenericTemplate([
            new fb.Element({
              title: context.event_info.name,
              item_url: context.welcome_msg.photo,
              image_url: context.welcome_msg.photo,
              subtitle: context.welcome_msg.texte,
              buttons: buttonsArray,
            }),
          ])
        ).then(() => {
          // console.log('Debug: ', JSON.stringify(res1));
          const eventqr1 = new fb.QuickReply({ title: 'Je valide', payload: 'VAL_EVENT', image_url: `${sslRootUrl}/images/circle/validate.png` });
          const eventqr2 = new fb.QuickReply({ title: 'Je modifie', payload: 'NEW_EVENT', image_url: `${sslRootUrl}/images/circle/edit_event.png ` });
          const eventqrs = new fb.QuickReplies([eventqr1, eventqr2]);

          messenger.send(Object.assign(
              { text: 'Faites votre choix:' },
              eventqrs
            ));
        });
      });
    } else {
      throw Error(`Error in recapEvent, user not found: ${JSON.stringify(message)}`);
    }
  });
}

function validateEvent(message, callback) {
  const senderId = message.sender.id;
  const invitCode = speakeasy.totp({
    secret: process.env.SPEAKEASY_SECRET_TOKEN.base32 + senderId,
    digits: 6,
  });
  User.findOne({ senderid: senderId }, (err, userObj) => {
    if ('context' in userObj) {
      const myContext = userObj.context;
      saveImage(myContext.welcome_msg.photo, (s3ImageUrl) => {
        const newEvent = new Event({
          senderid: senderId,
          admin_list: [senderId],
          password: invitCode,
          event_info: {
            name: myContext.event_info.name,
            description: myContext.event_info.description,
            start_date: myContext.event_info.start_date,
            end_date: myContext.event_info.end_date,
            location: {
              lat: myContext.event_info.location.lat,
              long: myContext.event_info.location.long,
            },
          },
          welcome_msg: {
            photo: s3ImageUrl,
            video: myContext.welcome_msg.video,
            texte: myContext.welcome_msg.texte,
            audio: myContext.welcome_msg.audio,
          },
        });
        newEvent.save((err, eventObject) => {
          if (err) {
            console.log('Error: ', err);
          } else {
            const newEventData = new EventData({
              eventid: eventObject.id,
              moderators: [senderId],
              join_users: [senderId],
            });
            newEventData.save((err) => {
              if (err) {
                console.log('Error: ', err);
              } else {
                UserData.update({ userid: senderId },
                  { $push: { admin: eventObject.id } }, (err) => {
                    if (err) {
                      console.log('Error: ', err);
                    } else {
                      console.log('New event created and userData updated');
                      messenger.send({ text: 'Votre évènement est enregistré' })
                      .then((res) => {
                        messenger.send({ text: `Code d'invitation pour vos invités: ${invitCode}` })
                      .then((res) => { callback(); });
                      });
                    }
                  });
              }
            });
          }
        });
      });
    }
  });
}

//--------------------------------------------------------------------------------------------
// PARTICIPATION Function
//--------------------------------------------------------------------------------------------

function camera(message, callback) {
  const senderId = message.sender.id;
  getContext(senderId, (context) => {
    if (context && 'joinEventId' in context) {
      messenger.send({
        attachment: {
          type: 'template',
          payload: {
            template_type: 'list',
            top_element_style: 'compact',
            elements: [{
              title: 'Ajouter une photo',
              image_url: `${sslRootUrl}/images/square/add_photo.png`,
              subtitle: 'Prendre une photo ou selectionner des photos à envoyer',
              default_action: {
                type: 'web_url',
                url: `${sslWebUrl}/camera/${senderId}/${context.joinEventId}`,
                messenger_extensions: true,
                webview_height_ratio: 'full',
              },
            }, {
              title: 'Gallerie photo',
              image_url: `${sslRootUrl}/images/square/collection.png`,
              subtitle: `Gallerie de photo de l'évènement`,
              default_action: {
                type: 'web_url',
                url: `${sslWebUrl}/gallery/${context.joinEventId}`,
                messenger_extensions: true,
                webview_height_ratio: 'full',
              },
            }],
            buttons: [{
              title: 'AIDE',
              type: 'postback',
              payload: 'help',
            }],
          },
        },
      });
    }
  });
}

function introMessage(eventId, callback) {
  Event.findOne({ _id: eventId }, (err, eventObject) => {
    if (err) throw Error(`Error in findOne introMessage: ${err}`);

    if (eventObject) {
      const recapEventText = `Bienvenu dans l'évenement\n ${eventObject.event_info.name}`;
      const buttonsArray = [];
      if (eventObject.welcome_msg.video !== '') {
        buttonsArray.push(
          new fb.Button({
            type: 'web_url',
            title: 'Video',
            webview_height_ratio: 'tall',
            // messenger_extensions: true,
            url: eventObject.welcome_msg.video,
          })
        );
      }
      messenger.send({ text: recapEventText }).then(() => {
        messenger.send(
          new fb.GenericTemplate([
            new fb.Element({
              title: eventObject.event_info.name,
              item_url: eventObject.welcome_msg.photo,
              image_url: eventObject.welcome_msg.photo,
              subtitle: eventObject.welcome_msg.texte,
              buttons: buttonsArray,
            }),
          ])
        ).then(() => {
          if (eventObject.welcome_msg.audio !== '') {
            messenger.send(new fb.Audio({ url: eventObject.welcome_msg.audio }))
            .then(() => {
              callback();
            });
          } else {
            callback();
          }
        });
      });
    }
  });
}

function searchEvent(message, callback) {
  if ('text' in message.message) {
    const searchText = message.message.text;
    Event.search({
      match: {
        'event_info.name': searchText,
      },
    },
      { size: 3,
        sort: '_score',
      },
    (err, results) => {
      if (results.hits && results.hits.total >= 1) {
        const hitList = results.hits.hits;
        const hitListElements = [];

        hitList.forEach((hit) => {
          hitListElements.push(
            new fb.Element({
              title: hit._source.event_info.name,
              image_url: hit._source.welcome_msg.photo,
              subtitle: hit._source.event_info.description,
              buttons: [
                new fb.Button({ type: 'postback', title: 'REJOINDRE', payload: `JOIN_EVENT#${hit._id}` }),
              ],
            })
          );
        });
        messenger.send(
          new fb.GenericTemplate(hitListElements)
        ).then(() => {
          sendMessage('REJOINDRE un évènement ou effectuez une nouvelle recherche');
        });
      } else {
        sendMessage('Désolé, aucun évènement trouvé...\nVeuillez faire une nouvelle recherche');
      }
    });
  } else {
    sendMessage("Quel est le nom de l'évènement auquel vous souhaitez participer ?");
  }
}

function joinningEvent(message, callback) {
  const eventId = message.postback.payload.split('#', 2)[1];
  const senderId = message.sender.id;

  EventData.findOne({ eventid: eventId }, (err, eventDataObject) => {
    if (err) throw Error(`Error in findOne EventData: ${err}`);

    let bannedUser = false;
    let moderators = false;
    let join = false;
    let i;

    if (eventDataObject) {
      for (i = 0; i < eventDataObject.banned_users.length; i += 1) {
        if (eventDataObject.banned_users[i] === senderId) {
          bannedUser = true;
        }
      }
      for (i = 0; i < eventDataObject.moderators.length; i += 1) {
        if (eventDataObject.moderators[i] === senderId) {
          moderators = true;
        }
      }
      for (i = 0; i < eventDataObject.join_users.length; i += 1) {
        if (eventDataObject.join_users[i] === senderId) {
          join = true;
        }
      }

      if (bannedUser) {
        sendMessage('Désolé, mais vous êtes bannis de ce groupe');
      } else if (join) {
        User.update({ senderid: senderId },
          { $set: { 'context.verified': true, 'context.joinEventId': eventId } },
          (err) => {
            if (err) throw Error(`Error in update joinningEvent: ${err}`);

            setNextPayload(senderId, 'SENDTO_EVENT', () => {
              introMessage(eventId, () => {
                camera(message);
              });
            });
          });
      } else {
        const contextJoinEvent = {
          joinEventId: eventId,
          verified: false,
        };
        updateContext(senderId, contextJoinEvent, () => {
          setNextPayload(senderId, 'CHECK_INVITATION_CODE', () => {
            sendMessage("Taper le code d'invitation");
          });
        });
      }
    } else {
      console.log('Erreur eventDataObject', JSON.stringify(eventDataObject));
    }
  });
}

function checkInvtCode(message, callback) {
  const senderId = message.sender.id;

  if ('text' in message.message) {
    const invitCode = message.message.text;

    User.findOne({senderid: senderId}, (err, userObject) => {
      if (err) throw Error(`Error in findOne checkInvtCode1: ${err}`);

      if (userObject) {
        if ('joinEventId' in userObject.context) {
          Event.findOne({ _id: userObject.context.joinEventId }, (err, eventObject) => {
            if (err) throw Error(`Error in findOne checkInvtCode2: ${err}`);

            if (eventObject) {
              if (invitCode.trim() === eventObject.password) {
                EventData.update({ eventid: eventObject._id }, { $push: { join_users: senderId } },
                  (err) => {
                    if (err) throw Error(`Error in findOne checkInvtCode3: ${err}`);

                    User.update({ userid: senderId }, { $set: { 'context.verified': true, 'context.joinEventId': eventObject._id } }, (err) => {
                      if (err) throw Error(`Error in findOne checkInvtCode4: ${err}`);

                      setNextPayload(senderId, 'SENDTO_EVENT', () => {
                        introMessage(userObject.context.joinEventId, () => {
                          camera(message);
                        });
                      });
                    });
                  });
              } else {
                sendMessage('Désolé code incorrect...', () => {
                  sendMessage("Taper le code d'invitation");
                });
              }
            } else {
              console.log('Event not found ! eventid: ', userObject.context.joinEventId);
            }
          });
        }
      } else {
        console.log('User not found ! SenderId: ', senderId);
      }
    });
  } else {
    sendMessage("Taper le code d'invitation");
  }
}

//--------------------------------------------------------------------------------------------
// ActionCall Function
//--------------------------------------------------------------------------------------------
function actionCall(actionPayload, message) {
  const senderId = message.sender.id;
  return new Promise((resolve, reject) => {
    console.log(`senderId ${senderId} actionCall payload: ${actionPayload}`);

    const actions = {
      PARTI_EVENEMENT: () => { // Join event as a guest
        userCheck(message, () => {
          setNextPayload(senderId, 'SEARCH_EVENT', () => {
            sendMessage("Quel est le nom de l'évènement auquel vous souhaitez participer ?");
          });
        });
      },
      ORGAN_EVENEMENT: () => {
        userMobileCheck(message, () => {
          setNextPayload(senderId, 'ORGAN_EVENEMENT', () => {
            choiceOrganis();
          });
        });
      },
      CONF_MOBILE: () => {
        addMobileToUser(message, userMobileCheck);
      },
      MOBILE_REQUEST: () => {
        mobileRequest(senderId);
      },
      CHECK_SMS_OUI: () => {
        sendMessage('Retapez le code invitation reçu par SMS', () => {
          console.log('CHECK_SMS_OUI just run');
        });
      },
      CHECK_SMS_NON: () => {
        mobileRequest(senderId);
      },
      NEW_EVENT: () => {
        userMobileCheck(message, () => {
          setNextPayload(senderId, 'ADD_EVENT', () => {
            updateContext(senderId, {}, () => {
              createNewEvent(message, () => {

              });
            });
          });
        });
      },
      ADD_EVENT: () => {
        userMobileCheck(message, () => {
          createNewEvent(message, () => {

          });
        });
      },
      RECAP_EVENT: () => {
        userMobileCheck(message, () => {
          recapEvent(message, () => {
            // Enregistrement d'un nouvel evenement
          });
        });
      },
      VAL_EVENT: () => {
        userMobileCheck(message, () => {
          validateEvent(message, () => {
            updateContext(senderId, {}, () => {
              setNextPayload(senderId, '', () => {
                demarrer();
              });
            });
          });
        });
      },
      SEARCH_EVENT: () => {
        userCheck(message, () => {
          searchEvent(message);
        });
      },
      JOIN_EVENT: () => {
        userCheck(message, () => {
          joinningEvent(message);
        });
      },
      SENDTO_EVENT: () => {
        userCheck(message, () => {
          // TODO: Reception des messages text
          camera(message);
        });
      },
      EDIT_EVENT: () => {
        userMobileCheck(message, () => {
          setNextPayload(senderId, 'EDIT_EVENT', () => {
            // Not in use in MVP version
          });
        });
      },
      CHECK_INVITATION_CODE: () => {
        userCheck(message, () => {
          checkInvtCode(message);
        });
      },
      help: () => {
        sendMessage("l'aide est en cours de réalisation...");
      },
      DEFAULT: () => {
        demarrer();
      },
    };

    // Run actions check. if any then run default action
    (actions[actionPayload] || actions.DEFAULT)();
  });
}
//------------------------------------------------------------------------------------------------
// On Events
//------------------------------------------------------------------------------------------------
function receiveMessage(message, callback) {
  console.log(`Message received: ${JSON.stringify(message)}`);
  let payload = 'DEFAULT';
  // Payload quick replies

  if ('postback' in message && message.postback.payload) {
    // Passage de parametre dans le payload
    if (message.postback.payload.indexOf('#')) {
      payload = message.postback.payload.split('#', 1)[0];
    } else {
      payload = message.postback.payload;
    }
    actionCall(payload, message);
  } else if ('quick_reply' in message.message) {
    if ('payload' in message.message.quick_reply) {
      // Passage de parametre dans le payload
      if (message.message.quick_reply.payload.indexOf('#')) {
        payload = message.message.quick_reply.payload.split('#', 1)[0];
      } else {
        payload = message.message.quick_reply.payload;
      }
    }
    actionCall(payload, message);
  } else if ('text' in message.message || 'attachments' in message.message) {
    User.findOne({ senderid: message.sender.id }, (err, userObj) => {
      if (err) throw Error(`Error in findOne senderId: ${err}`);

      if (userObj) { // User exist
        payload = userObj.next_payload;
      }
      actionCall(payload, message);
    });
  } else {
    // Take action !!
    actionCall(payload, message);
  }
}

// postback Calls
messenger.on('postback', (message) => {
  receiveMessage(message);
});

// Action lors de la reception d'un message
messenger.on('message', (message) => {
  receiveMessage(message);
});

//-------------------------------------------------------------------------------------------
// Routes for our API and facebook webhook
//-------------------------------------------------------------------------------------------

// Server API
app.get('/messenger/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    res.sendStatus(400);
  }
});

app.get('/messenger/init', (req, res) => {
  botInit();
  res.sendStatus(200);
});

app.get('/messenger/addweb', (req, res) => {
  messenger.addWhitelistedDomains(WHITELISTED_DOMAINS).then((res1) => {
    console.log('addWhitelistedDomains: ', res1);
  });
  res.sendStatus(200);
});

app.get('/messenger/removethread', (req, res) => {
  threadBotRemove();
  res.sendStatus(200);
});

// Check connection
app.get('/messenger/checkserver', (req, res) => {
  console.log('Server connexion OK !');
  res.sendStatus(200);
});

// Facebook Webhook
app.post('/messenger/webhook', (req, res) => {
  res.sendStatus(200);
  messenger.handle(req.body);
});


app.post('/messenger/uploads', (req, res) => {
  // res.sendStatus(200);
  const transloaditResponse = JSON.parse(req.body.transloadit);
  // console.log('transloadit: ', transloadit.fields);

  // Ajoute l'image dans la base attach
  addAttach(transloaditResponse, (attach) => {
    // Affiche la page recap des image uploadées
    res.render('upload', {
      senderid: attach.userid,
      eventid: attach.eventid,
      senderImage: [
        {
          thumbnail_url: attach.thumbnail_url,
          message: attach.message,
        },
      ],
    });
  });
});


app.get('/messenger/camera/:senderid/:eventid/', (req, res) => {
  res.render('camera', {
    eventid: req.params.eventid,
    senderid: req.params.senderid,
  });
});

app.get('/messenger/gallery/:eventid/', (req, res) => {
  eventGallery(req.params.eventid, (attachArray) => {
    if (attachArray === false) {
      sendMessage('Aucune photo dans la gallerie, désolé...');
    } else {
      res.render('gallery', {
        eventImage: attachArray,
      });
    }
  });
});
//------------------------------------------------------------------------------------
// Start Server
//------------------------------------------------------------------------------------
app.listen(2368, () => {
  console.log('App listening on port 2368!');
});