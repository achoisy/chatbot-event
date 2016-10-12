// Import
const dotenv = require('dotenv');
// Config files load
dotenv.config({ silent: true });
// Import
const express = require('express');
const bodyParser = require('body-parser');
const fb = require('fbmessenger');
const mongoose = require('mongoose');
const User = require('./models/users'); // Model for mongoose schema validation USERS
const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const speakeasy = require('speakeasy'); // Two factor authentication
const path = require('path');
const moment = require('moment');

moment.locale('fr'); // 'fr'

// google phone checker
// Require `PhoneNumberFormat`.
const PNF = require('google-libphonenumber').PhoneNumberFormat;
// Get an instance of `PhoneNumberUtil`.
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

// Compose.io Mongo url
const mongodbUrl = 'mongodb://pizzabot:PizzaAlex!@capital.4.mongolayer.com:10159,capital.5.mongolayer.com:10159/pizzabot?replicaSet=set-56af54fbaaeb0dd3a2001606';
mongoose.Promise = global.Promise;
mongoose.connect(mongodbUrl);

// Express wrap
const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Configuration du webhook facebook
const messenger = new fb.Messenger({
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
});

// Liste d'url accessible
const WHITELISTED_DOMAINS = [
  'http://chatbotsmaker.fr',
  'https://call2text.me',
];

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
    payload: 'start',
  });

  const menu_blog = new fb.PersistentMenuItem({
    type: 'web_url',
    title: 'Chatbots Blog',
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
        title: 'Organiser un évènement',
        // item_url: 'https://call2text.me/images/new_event.png',
        image_url: 'https://call2text.me/images/square/new_event.png',
        subtitle: "Si vous organisez ou avez les droits d'administration d'un évènement",
      }),
      new fb.Element({
        title: 'Participer à un évènement',
        // item_url: 'https://call2text.me/images/edit_event.png',
        image_url: 'https://call2text.me/images/square/join_event.png',
        subtitle: "Si Vous êtes invités à participer à un évènement",
      }),
    ])
  ).then((res) => {
    const demqr1 = new fb.QuickReply({ title: `J'organise`, payload: 'ORGAN_EVENEMENT', image_url: 'https://call2text.me/images/circle/new_event.png' });
    // const qr2 = new fb.QuickReply({ title: 'MODIFIER', payload: 'MODIF_EVENEMENT'});
    const demqr2 = new fb.QuickReply({ title: 'Je participe', payload: 'PARTI_EVENEMENT', image_url: 'https://call2text.me/images/circle/join_event.png' });
    const demqrs = new fb.QuickReplies([demqr1, demqr2]);
    messenger.send(Object.assign(
        { text: 'Faites votre choix:' },
        demqrs
      )).then((res) => { console.log('QuickReply: ', res); });
  });
}

function setNextPayload(senderId, nextPayload, callback) {
  User.findOneAndUpdate({ senderid: senderId },
    { $set: { next_payload: nextPayload } },
    (err, userObj) => {
      if (err) throw Error(`Error in findOne senderId: ${err}`);

      if (userObj) { // User exist
        console.log(`Set next payload on user profil: ${nextPayload} `);
      }
      callback();
    });
}

function updateContext(senderId, conText, callback) {
  User.findOneAndUpdate({ senderid: senderId },
    { $set: { context: conText } },
    (err, userObj) => {
      if (err) throw Error(`Error in findOneAndUpdate updateContext: ${err}`);

      callback();
    }
  );
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

      messenger.send({ text: 'Tapez votre numero de Mobile (ex: 0696123456).' })
      .catch((err) => {
        console.error('Erreur userMobileCheck!');
      });
    });
}

function confirmMobileNumber(mobileNumber) {
  const conqr1 = new fb.QuickReply({ title: 'Oui', payload: `CONF_MOBILE#${phoneUtil.format(mobileNumber, PNF.E164)}`, image_url: 'https://call2text.me/images/circle/yes.png' });
  const conqr2 = new fb.QuickReply({ title: 'Non', payload: 'MOBILE_REQUEST', image_url: 'https://call2text.me/images/circle/no.png' });
  const conqrs = new fb.QuickReplies([conqr1, conqr2]);
  console.log(conqrs);
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
  console.log(`Mobile number is: ${mobileNumber} `);
  User.findOneAndUpdate(
    { senderid: senderId },
    { $set: { 'user_mobile.mobile_number': mobileNumber, 'user_mobile.verified': false, 'user_mobile.verif_proc': false } },
    (err, userObj) => {
      if (err) throw Error(`Error in findOne senderId: ${err}`);
      callback(message);
    });
}

function validateUser(senderId) {
  console.log(`Mobile number validate for userid: ${senderId} `);
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
    console.log('Twilio Message :', message.sid);
    // console.log('Fake twilio message');
    // Save Code in user profile and set verif_proc:true
    User.findOneAndUpdate({ senderid: senderId },
      { $set: { 'user_mobile.verif_proc': true } },
      (err, userObj) => {
        if (err) throw Error(`Error in findOneAndUpdate smsCodeSend: ${err}`);
        console.log('findone !!!!');
        // request invitation code to user
        messenger.send({ text: 'Tapez le code invitation reçu par SMS' })
        .catch((err) => {
          console.error(`Erreur smsCodeSend! ${err}`);
        });
      });
  });
}

function userMobileCheck(message, callback) {
  const senderId = message.sender.id;
  console.log("Entering userMobileCheck");
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
        console.log(`numberValid: ${numberValid}`);
        if (numberValid) {
          console.log("mobile getNumberType: " + phoneUtil.getNumberType(mobileNumber));
          if (phoneUtil.getNumberType(mobileNumber) !== 1) {
            // Numero n est pas un num mobile
            messenger.send({ text: `Désolé, mais le numéro ${phoneUtil.format(mobileNumber, PNF.NATIONAL)} n'est pas un numéro de mobile` })
            .then((res) => {
              console.log('res: ', res);
              mobileRequest(senderId);
            });
          } else { // Numero mobile valide
            confirmMobileNumber(mobileNumber);
          }
        } else {
          // Numero non valide
          messenger.send({ text: `Désolé, mais le numéro n'est pas valide` })
          .then((res) => {
            console.log('res: ', res);
            mobileRequest(senderId);
          });
        }
      } else { // User à deja un numero de mobile
        // Send SMS Verification
        if (!userObj.user_mobile.verified) { // User mobile number is not verified
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
              messenger.send({ text: `Désolé, mais le code d'invitation n'est pas valide` })
              .then((res) => {
                console.log("send checkIfReceivedSMS");
                checkIfReceivedSMS(userObj.user_mobile.mobile_number);
              });
            } else { // Code SMS OK. rediriger vers le service demandé
              validateUser(senderId);
              callback(message);
            }
          } else { // User should enter SMS code again
            messenger.send({ text: 'Tapez le code invitation reçu par SMS' })
            .catch((err) => {
              console.error(`Erreur smsCodeSend! ${err}`);
            });
          }
        } else { // User should continu to service requested
          console.log('Suite de la validation du numero !!');
          callback(message);
        }
      }
    } else {  // User n'existe pas
      messenger.getUser().then((user) => {
        const newUser = new User({
          senderid: senderId,
          user_profile: user,
          last_payload: '',
          next_payload: message.message.quick_reply.payload,
          context: {},
        });
        newUser.save()
        .then(messenger.send({ text: 'Ceci est votre 1er connexion !' }))
        .then((res) => {
          console.log('res: ', res);
          mobileRequest(senderId);
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
        // item_url: 'https://call2text.me/images/new_event.png',
        image_url: 'https://call2text.me/images/square/add_event.png',
        subtitle: "Créez votre nouvelle évènement et centralisez les photos, vidéos et commentaires de vos évènements",
      }),
      new fb.Element({
        title: 'Modifier évènement',
        // item_url: 'https://call2text.me/images/edit_event.png',
        image_url: 'https://call2text.me/images/square/edit_event.png',
        subtitle: "Modification d'un évènement déjà créé dont vous êtes l'administrateur.",
      }),
    ])
  ).then((res) => {
    const eventqr1 = new fb.QuickReply({ title: 'Créer évènement', payload: 'NEW_EVENT', image_url: 'https://call2text.me/images/circle/add_event.png' });
    const eventqr2 = new fb.QuickReply({ title: 'Modifier évènement', payload: 'EDIT_EVENT', image_url: 'https://call2text.me/images/circle/edit_event.png' });
    const eventqrs = new fb.QuickReplies([eventqr1, eventqr2]);
    console.log(eventqrs);
    messenger.send(Object.assign(
        { text: 'Faites votre choix:' },
        eventqrs
      )).then((res) => { console.log('QuickReply: ', res); });
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

      if ('event_info' in context && 'welcome_msg' in context) {
        console.log(`Context: ${JSON.stringify(context)}`);
        if (!context.event_info.name) {
          context.event_info.name = message.message.text;
          updateContext(senderId, context, () => {
            messenger.send({ text: 'Donner une brève description de votre évènement' });
          });
        } else if (!context.event_info.description) {
          context.event_info.description = message.message.text;
          updateContext(senderId, context, () => {
            messenger.send({ text: 'Date de debut de votre évènement au format JJ/MM/AAAA HH:HH ex: 29/12/2016 22H30' })
            .then((res) => {
              console.log('Debug: ', res);
            })
            .catch((err) => {
              console.error(`Erreur updateContext ! ${err}`);
            });
          });
        } else if (!context.event_info.start_date) {
          const startDate = moment(message.message.text, 'DD-MM-YYYY HH:mm');
          if (startDate.isValid()) {
            context.event_info.start_date = startDate.toDate();
            updateContext(senderId, context, () => {
              messenger.send({ text: 'Date de fin de votre évènement au format JJ/MM/AAAA HH:HH ex: 29/12/2016 22H30' })
              .then((res) => {
                console.log('Debug: ', res);
              })
              .catch((err) => {
                console.error(`Erreur updateContext ! ${err}`);
              });
            });
          } else {
            messenger.send({ text: 'Date de debut de votre évènement au format JJ/MM/AAAA HH:HH ex: 29/12/2016 22H30' })
            .then((res) => {
              console.log('Debug: ', res);
            })
            .catch((err) => {
              console.error(`Erreur updateContext ! ${err}`);
            });
          }
        } else if (!context.event_info.end_date) {
          const startEnd = moment(message.message.text, 'DD-MM-YYYY HH:mm');
          if (startEnd.isValid()) {
            context.event_info.end_date = startEnd.toDate();
            updateContext(senderId, context, () => {
              location('Ou se déroule votre évènement ?');
            });
          } else {
            messenger.send({ text: 'Date de fin de votre évènement au format JJ/MM/AAAA HH:HH ex: 29/12/2016 22H30' })
            .then((res) => {
              console.log('Debug: ', res);
            })
            .catch((err) => {
              console.error(`Erreur updateContext ! ${err}`);
            });
          }
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
        console.log(`Updateing context: ${JSON.stringify(context)}`);
        updateContext(senderId, context, () => {
          messenger.send({ text: 'Quel est le nom de votre évènement ?' });
        });
      }
    } else {
      throw Error(`Error in findOne userObj sender ID: ${senderId}`);
    }
  });
}
//--------------------------------------------------------------------------------------------
// ActionCall Function
//--------------------------------------------------------------------------------------------
function actionCall(actionPayload, message) {
  const senderId = message.sender.id;
  return new Promise((resolve, reject) => {
    console.log(`actionCall payload: ${actionPayload}`);

    const actions = {
      PARTI_EVENEMENT: () => { // Join event as a guest
        userMobileCheck(message, () => {
          console.log('Entering event as a guest' + message);
        });
      },
      ORGAN_EVENEMENT: () => {
        userMobileCheck(message, () => {
          console.log('Entering event as a Host' + message.sender.id);
          choiceOrganis();
        });
      },
      CONF_MOBILE: () => {
        addMobileToUser(message, userMobileCheck);
      },
      MOBILE_REQUEST: () => {
        mobileRequest(senderId);
      },
      CHECK_SMS_OUI: () => {
        messenger.send({ text: 'Retapez le code invitation reçu par SMS' })
        .catch((err) => {
          console.error(`Erreur smsCodeSend! ${err}`);
        });
      },
      CHECK_SMS_NON: () => {
        mobileRequest(senderId);
      },
      NEW_EVENT: () => {
        userMobileCheck(message, () => {
          setNextPayload(senderId, 'ADD_EVENT', () => {
            updateContext(senderId, '', () => {
              createNewEvent(message, () => {
                console.log("createNewEvent OK");
              });
            });
          });
        });
      },
      ADD_EVENT: () => {
        userMobileCheck(message, () => {
          createNewEvent(message, () => {
            console.log("createNewEvent OK");
          });
        });
      },
      EDIT_EVENT: () => {
        userMobileCheck(message, () => {
          setNextPayload(senderId, 'EDIT_EVENT', () => {
            messenger.send({ text: 'Quel est le nom de votre évènement ?' })
            .catch((err) => {
              console.error(`Erreur NEW_EVENT! ${err}`);
            });
          });
        });
      },
      DEFAULT: () => {
        console.log("Action Call DEFAULT!!!");
      }
    };

    // Run actions check. if any then run default action
    (actions[actionPayload] || actions.DEFAULT)();
  });
}
//------------------------------------------------------------------------------------------------
// On Events
//------------------------------------------------------------------------------------------------

// postback Calls
messenger.on('postback', (message) => {
  const payload = message.postback.payload;
  console.log(`Postback payload: ${payload}`);

  // Selon payload
  switch (payload) {
    case 'help':
      console.log('Help payload');
      messenger.send({ text: "l'aide est en cours de réalisation..." })
        .then((res) => {
          console.log(res);
        });
      break;
    case 'start': {
      demarrer();
      break;
    }
    default:

  }
});

// Action lors de la reception d'un message
messenger.on('message', (message) => {
  console.log(`Message received: ${JSON.stringify(message)}`);
  let payload = '';
  // Payload quick replies
  if ('quick_reply' in message.message) {
    if ('payload' in message.message.quick_reply) {
      // Passage de parametre dans le payload
      if (message.message.quick_reply.payload.indexOf('#')) {
        payload = message.message.quick_reply.payload.split('#', 1)[0];
      } else {
        payload = message.message.quick_reply.payload;
      }

      actionCall(payload, message)
      .then(console.log('Ok for actionCall'))
      .catch((err) => {
        console.error(`Erreur actionCall Payload: ${payload}`);
      });
    }
  } else if ('text' in message.message) {
    console.log('Text message');
    User.findOne({ senderid: message.sender.id }, (err, userObj) => {
      if (err) throw Error(`Error in findOne senderId: ${err}`);

      if (userObj) { // User exist
        payload = userObj.next_payload;
        console.log(`Next payload on user profil: ${payload} `);
        actionCall(payload, message)
        .then(console.log('Ok for actionCall'))
        .catch((err) => {
          console.error(`Erreur actionCall Payload: ${payload}`);
        });
      } else {  // User n'existe pas
        messenger.send({ text: 'Veuillez faire un choix...' })
        .then(demarrer());
      }
    });
  }
});

//-------------------------------------------------------------------------------------------
// Routes for our API and facebook webhook
//-------------------------------------------------------------------------------------------

// Server API
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] === 'subscribe' &&
    req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    res.send(req.query['hub.challenge']);
  } else {
    console.log('received');
    res.sendStatus(400);
  }
});

app.get('/init', (req, res) => {
  botInit();
  res.sendStatus(200);
});

app.get('/addweb', (req, res) => {
  messenger.addWhitelistedDomains(WHITELISTED_DOMAINS).then((res) => {
    console.log('addWhitelistedDomains: ', res);
  });
  res.sendStatus(200);
});

app.get('/removethread', (req, res) => {
  threadBotRemove();
  res.sendStatus(200);
});

// Check connection
app.get('/checkserver', (req, res) => {
  console.log('Server connexion OK !');
  res.sendStatus(200);
});

// Facebook Webhook
app.post('/webhook', (req, res) => {
  res.sendStatus(200);
  messenger.handle(req.body);
});

app.get('/datepicker', (req, res) => {
  res.sendFile(path.join(__dirname + '/datepicker.html'));
});

//------------------------------------------------------------------------------------
// Start Server
//------------------------------------------------------------------------------------
app.listen(2368, () => {
  console.log('App listening on port 2368!');
});
