// Import
const dotenv = require('dotenv');
// Config files load
dotenv.config({ silent: true });
// Import
const express = require('express');
const bodyParser = require('body-parser');
const fb = require('fbmessenger');
const mongoose = require('mongoose');
const speakeasy = require('speakeasy'); // Two factor authentication
const path = require('path');
const moment = require('moment');
const exphbs = require('express-handlebars');
const TransloaditClient = require('transloadit');

const msg = require('./lib/message.js');
const eventData = require('./lib/eventdata.js');
const mobile = require('./lib/mobile.js');

// Model for mongoose schema
const User = require('./models/users');
const Event = require('./models/events');
const EventData = require('./models/eventdata');
const UserData = require('./models/userdata');
// const Attach = require('./models/attach');


moment.locale('fr'); // 'fr'

// Compose.io Mongo url
const mongodbUrl = process.env.MONGODB_CONNECT;
mongoose.Promise = global.Promise;
mongoose.connect(mongodbUrl);

// transloadit connection
const transloadit = new TransloaditClient({
  authKey: process.env.TRANSLOADIT_AUTH_KEY,
  authSecret: process.env.TRANSLOADIT_AUTH_SECRET,
});

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


//--------------------------------------------------------------------------------------------
// General Function
//--------------------------------------------------------------------------------------------


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
// ORGANISATION Function
//--------------------------------------------------------------------------------------------


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
            msg.send('Donner une brève description de votre évènement');
          });
        } else if (!context.event_info.description) {
          context.event_info.description = message.message.text;
          updateContext(senderId, context, () => {
            msg.choixAddEvent();
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
            msg.send('Bien reçu...', () => {
              msg.choixAddEvent();
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

function recapEvent(message) {
  const senderId = message.sender.id;
  User.findOne({ senderid: senderId }, (err, userObj) => {
    if (err) throw Error(`Error in findOne senderId: ${err}`);

    if ('context' in userObj) {
      msg.recapEvent(userObj);
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

function camera(message) {
  const senderId = message.sender.id;
  getContext(senderId, (context) => {
    if (context && 'joinEventId' in context) {
      const eventDataObjet = eventData.findByEventID(context.joinEventId);

      if (eventDataObjet) {
        if (eventDataObjet.moderators.find(senderId)) {
          msg.photoMenuAdmin(senderId, context.joinEventId);
        } else {
          msg.photoMenu(senderId, context.joinEventId);
        }
      }
    }
  });
}

function introMessage(eventId, callback) {
  Event.findOne({ _id: eventId }, (err, eventObject) => {
    if (err) throw Error(`Error in findOne introMessage: ${err}`);

    if (eventObject) {
      msg.welcomeToEvent(eventObject, callback);
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
        msg.eventSearchResult(results.hits.hits, () => {
          msg.send('REJOINDRE un évènement ou effectuez une nouvelle recherche');
        });
      } else {
        msg.send('Désolé, aucun évènement trouvé...\nVeuillez faire une nouvelle recherche');
      }
    });
  } else {
    msg.send("Quel est le nom de l'évènement auquel vous souhaitez participer ?");
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
        msg.send('Désolé, mais vous êtes bannis de ce groupe');
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
            msg.send("Taper le code d'invitation");
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
                msg.send('Désolé code incorrect...', () => {
                  msg.send("Taper le code d'invitation");
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
    msg.send("Taper le code d'invitation");
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
        mobile.userCheck(message, () => {
          setNextPayload(senderId, 'SEARCH_EVENT', () => {
            msg.send("Quel est le nom de l'évènement auquel vous souhaitez participer ?");
          });
        });
      },
      CONF_MOBILE: () => {
        mobile.addToUser(message, mobile.userCheckSMS);
      },
      MOBILE_REQUEST: () => {
        mobile.request(senderId);
      },
      CHECK_SMS_OUI: () => {
        msg.send('Retapez le code invitation reçu par SMS', () => {
          console.log('CHECK_SMS_OUI just run');
        });
      },
      CHECK_SMS_NON: () => {
        mobile.request(senderId);
      },
      NEW_EVENT: () => {
        mobile.userCheckSMS(message, () => {
          setNextPayload(senderId, 'ADD_EVENT', () => {
            updateContext(senderId, {}, () => {
              createNewEvent(message, () => {

              });
            });
          });
        });
      },
      ADD_EVENT: () => {
        mobile.userCheckSMS(message, () => {
          createNewEvent(message, () => {

          });
        });
      },
      RECAP_EVENT: () => {
        mobile.userCheckSMS(message, () => {
          recapEvent(message, () => {
            // Enregistrement d'un nouvel evenement
          });
        });
      },
      VAL_EVENT: () => {
        mobile.userCheckSMS(message, () => {
          validateEvent(message, () => {
            updateContext(senderId, {}, () => {
              setNextPayload(senderId, '', () => {
                msg.start();
              });
            });
          });
        });
      },
      SEARCH_EVENT: () => {
        mobile.userCheck(message, () => {
          searchEvent(message);
        });
      },
      JOIN_EVENT: () => {
        mobile.userCheck(message, () => {
          joinningEvent(message);
        });
      },
      SENDTO_EVENT: () => {
        mobile.userCheck(message, () => {
          // TODO: Reception des messages text
          camera(message);
        });
      },
      EDIT_EVENT: () => {
        mobile.userCheckSMS(message, () => {
          setNextPayload(senderId, 'EDIT_EVENT', () => {
            // Not in use in MVP version
          });
        });
      },
      CHECK_INVITATION_CODE: () => {
        mobile.userCheck(message, () => {
          checkInvtCode(message);
        });
      },
      help: () => {
        msg.send("l'aide est en cours de réalisation...");
      },
      DEFAULT: () => {
        msg.start();
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

// Routes
require('./lib/routes')(app);

//------------------------------------------------------------------------------------
// Start Server
//------------------------------------------------------------------------------------
app.listen(2368, () => {
  console.log('App listening on port 2368!');
});

// expose app
exports = module.exports = app;
