const msg = require('./message.js');
const mobile = require('./mobile.js');
const User = require('../models/users');
const Event = require('../models/events');
// const TransloaditClient = require('transloadit');
const speakeasy = require('speakeasy'); // Two factor authentication
const user = require('./user.js');
const event = require('./event.js');

// transloadit connection
/* const transloadit = new TransloaditClient({
  authKey: process.env.TRANSLOADIT_AUTH_KEY,
  authSecret: process.env.TRANSLOADIT_AUTH_SECRET,
}); */

// AWS S3 bucket credit
/* const s3Bucket = {
  authKey: process.env.AWS_S3_ACCOUNT_ID,
  authSecret: process.env.AWS_S3_AUTH_SECRET,
  bucketName: process.env.AWS_S3_BUCKET_NAME,
}; */

//--------------------------------------------------------------------------------------------
// General Function
//--------------------------------------------------------------------------------------------
function introMessage(eventId, senderId, callback) {
  Event.findOne({ _id: eventId }, (err, eventObject) => {
    if (err) throw Error(`Error in findOne introMessage: ${err}`);

    if (eventObject) {
      msg.welcomeToEvent(eventObject, senderId, callback);
    }
  });
}

function getContext(senderId, callback) {
  User.findOne({ senderid: senderId }, (err, userObj) => {
    if (err) throw Error(`Error in findOne getContext: ${err}`);

    if (typeof callback === 'function') {
      if (userObj && 'context' in userObj) {
        // const context = userObj.context;
        // console.log('Context: ', JSON.stringify(context));
        callback(userObj.context);
      } else {
        callback();
      }
    }
  });
}

/* function saveImage(imageUrl, callback) {
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
} */

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
          context.event_info.name = `${message.message.text} @${userObj.user_profile.first_name}.${userObj.user_profile.last_name}`;
          updateContext(senderId, context, () => {
            msg.send('Donner une brève description de votre évènement', senderId);
          });
        } else if (!context.event_info.description) {
          context.event_info.description = message.message.text;
          updateContext(senderId, context, () => {
            msg.configEventMenu(senderId);
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
          msg.send('Quel est le nom de votre évènement ?', senderId);
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
      msg.recapEvent(userObj, senderId);
    } else {
      throw Error(`Error in recapEvent, user not found: ${JSON.stringify(message)}`);
    }
  });
}

function validateEvent(message, callback) {
  const senderId = message.sender.id;
  let invitCode = '';
  User.findOne({ senderid: senderId }, (err, userObj) => {
    if ('context' in userObj) {
      const myContext = userObj.context;
      if (myContext.setPassword) {
        invitCode = speakeasy.totp({
          secret: process.env.SPEAKEASY_SECRET_TOKEN.base32 + senderId,
          digits: 6,
        });
      }
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
          photo: myContext.welcome_msg.photo.thumbnail_url,
          video: myContext.welcome_msg.video,
          texte: myContext.welcome_msg.texte,
          audio: myContext.welcome_msg.audio,
        },
        cover_public_id: myContext.welcome_msg.photo.public_id,
        moderators: [senderId],
        join_users: [senderId],
      });
      newEvent.save((err, eventObj) => {
        if (err) throw Error(`action.js validateEvent.newEvent.save: ${err}`);

        let userMessage = '';
        if (invitCode) {
          userMessage = `Votre publication est enregistrée\n Code d'invitation pour vos invités: ${invitCode}`;
        } else {
          userMessage = 'Votre publication est enregistrée';
        }
        msg.send(userMessage, senderId, () => {
          callback(eventObj);
        });
      });
    }
  });
}

function searchEvent(message, callback) {
  const senderId = message.sender.id;
  if ('text' in message.message) {
    const searchText = message.message.text;
    event.eventSearchByName(searchText, (eventObj) => {
      if (eventObj) {
        msg.eventSearchResult(eventObj, senderId, () => {
          msg.send('REJOINDRE une publication ou effectuer une nouvelle recherche', senderId);
        });
      } else {
        msg.send('Désolé, aucune publication trouvée...\nVeuillez faire une nouvelle recherche', senderId);
      }
    });
  } else {
    msg.send("Quel est le nom de la publication à laquelle vous souhaitez participer ?", senderId);
  }
}

function searchPrintEvent(message) {
  const senderId = message.sender.id;
  if ('text' in message.message) {
    const searchText = message.message.text;
    event.eventSearchByName(searchText, (eventObj) => {
      if (eventObj) {
        msg.eventSearchPrintResult(senderId, eventObj, () => {
          msg.send('IMPRIMER une publication ou effectuer une nouvelle recherche', senderId);
        });
      } else {
        msg.send('Désolé, aucune publication trouvée...\nVeuillez faire une nouvelle recherche', senderId);
      }
    });
  } else {
    msg.send("Quel est le nom de la publication que vous souhaitez imprimer ?", senderId);
  }
}

function camera(senderId) {
  getContext(senderId, (context) => {
    if (context && 'joinEventId' in context) {
      msg.menuPhoto(senderId, context.joinEventId);
    }
  });
}

function joinningEvent(senderId, eventId) {
  event.eventByEventId(eventId, (eventObject) => {
    let bannedUser = false;
    let moderators = false;
    let join = false;
    let i;

    if (eventObject) {
      for (i = 0; i < eventObject.banned_users.length; i += 1) {
        if (eventObject.banned_users[i] === senderId) {
          bannedUser = true;
        }
      }
      for (i = 0; i < eventObject.moderators.length; i += 1) {
        if (eventObject.moderators[i] === senderId) {
          moderators = true;
        }
      }
      for (i = 0; i < eventObject.join_users.length; i += 1) {
        if (eventObject.join_users[i] === senderId) {
          join = true;
        }
      }

      if (bannedUser) {
        msg.send('Désolé, mais vous êtes banni(e) de ce groupe', senderId);
      } else if (join) { // User already join the publication
        User.update({ senderid: senderId },
          { $set: { 'context.verified': true, 'context.joinEventId': eventId } },
          (err) => {
            if (err) throw Error(`Error in update joinningEvent: ${err}`);

            setNextPayload(senderId, 'SENDTO_EVENT', () => {
              introMessage(eventId, senderId, () => {
                camera(senderId);
              });
            });
          });
      } else { // User first time in joinning publication
        const contextJoinEvent = {
          joinEventId: eventId,
          verified: false,
        };
        if (eventObject.password) {
          updateContext(senderId, contextJoinEvent, () => {
            setNextPayload(senderId, 'CHECK_INVITATION_CODE', () => {
              msg.send("Taper le code d'invitation", senderId);
            });
          });
        } else {
          event.addSenderIdToJoinUsers(eventId, senderId, () => {
            setNextPayload(senderId, 'SENDTO_EVENT', () => {
              introMessage(eventId, senderId, () => {
                camera(senderId);
              });
            });
          });
        }
      }
    } else {
      throw Error('eventDataObject', JSON.stringify(eventObject));
    }
  });
}

function checkInvtCode(message, callback) {
  const senderId = message.sender.id;

  if ('text' in message.message) {
    const invitCode = message.message.text;

    User.findOne({ senderid: senderId }, (err, userObject) => {
      if (err) throw Error(`Error in findOne checkInvtCode1: ${err}`);

      if (userObject) {
        if ('joinEventId' in userObject.context) {
          Event.findOne({ _id: userObject.context.joinEventId }, (err, eventObject) => {
            if (err) throw Error(`Error in findOne checkInvtCode2: ${err}`);

            if (eventObject) {
              if (invitCode.trim() === eventObject.password) {
                event.addSenderIdToJoinUsers(eventObject._id, senderId, () => {
                  setNextPayload(senderId, 'SENDTO_EVENT', () => {
                    introMessage(userObject.context.joinEventId, senderId, () => {
                      camera(senderId);
                    });
                  });
                });
              } else {
                msg.send('Désolé code incorrect...', senderId, () => {
                  msg.send("Taper le code d'invitation", senderId);
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
    msg.send("Taper le code d'invitation", senderId);
  }
}

module.exports = (actionPayload, message) => {
  const senderId = message.sender.id;
  console.log(`senderId ${senderId} actionCall payload: ${actionPayload}`);

  const actions = {
    PARTI_EVENEMENT: () => { // Join event as a guest
      mobile.userCheck(message, () => {
        setNextPayload(senderId, 'SEARCH_EVENT', () => {
          msg.send("Quel est le nom de la publication à laquelle vous souhaitez participer ?", senderId);
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
      msg.send('Retapez le code invitation reçu par SMS', senderId, () => {
        console.log('CHECK_SMS_OUI just run');
      });
    },
    CHECK_SMS_NON: () => {
      mobile.request(senderId);
    },
    NEW_EVENT: () => {
      mobile.userCheck(message, () => {
        setNextPayload(senderId, 'ADD_EVENT', () => {
          updateContext(senderId, {}, () => {
            createNewEvent(message, () => {

            });
          });
        });
      });
    },
    ADD_EVENT: () => {
      mobile.userCheck(message, () => {
        createNewEvent(message, () => {

        });
      });
    },
    RECAP_EVENT: () => {
      mobile.userCheck(message, () => {
        recapEvent(message, () => {
          // Enregistrement d'un nouvel evenement
        });
      });
    },
    ASK_PASSWORD: () => {
      mobile.userCheck(message, () => {
        msg.choixPassword(senderId);
      });
    },
    SET_PASSWORD: () => {
      mobile.userCheck(message, () => {
        user.getContext(senderId, (context) => {
          if (context) {
            const userContext = context;
            userContext.setPassword = true;
            user.updateContext(senderId, userContext, () => {
              // VAL_EVENT
              validateEvent(message, () => {
                updateContext(senderId, {}, () => {
                  setNextPayload(senderId, '', () => {
                    msg.start(senderId);
                  });
                });
              });
            });
          }
        });
      });
    },
    VAL_EVENT: () => {
      mobile.userCheck(message, () => {
        validateEvent(message, (eventObj) => {
          joinningEvent(senderId, eventObj._id);
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
        const eventId = message.postback.payload.split('#', 2)[1];
        joinningEvent(senderId, eventId);
      });
    },
    SENDTO_EVENT: () => {
      mobile.userCheck(message, () => {
        // TODO: Reception des messages text
        camera(senderId);
      });
    },
    EDIT_EVENT: () => {
      mobile.userCheck(message, () => {
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
    START_PRINT: () => {
      mobile.userCheck(message, () => {
        setNextPayload(senderId, 'SEARCH_EVENT_PRINT', () => {
          msg.send("Quel est le nom de la publication que vous souhaitez imprimer ?", senderId);
        });
      });
    },
    SEARCH_EVENT_PRINT: () => {
      mobile.userCheck(message, () => {
        searchPrintEvent(message);
      });
    },
    PRINT_MAGAZINE: () => { // Printing procedure
      mobile.userCheck(message, () => {
        setNextPayload(senderId, 'PRINT_MAGAZINE', () => {
          updateContext(senderId, {}, () => {
            msg.printingMenu(senderId);
          });
        });
      });
    },
    COVER_SELECT: () => {
      mobile.userCheck(message, () => {
        msg.configEventMenu(senderId);
      });
    },
    help: () => {
      msg.send("l'aide est en cours de réalisation...", senderId);
    },
    DEFAULT: () => {
      msg.start(senderId);
    },
  };

  // Run actions check. if any then run default action
  (actions[actionPayload] || actions.DEFAULT)();
};
