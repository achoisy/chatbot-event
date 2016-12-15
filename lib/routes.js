// Import
const msg = require('./message.js');
const fbsettings = require('./threadSettings.js');
const attach = require('./attach.js');
const print = require('./print.js');
const peecho = require('./peecho.js');
const user = require('./user.js');
const eventData = require('./eventdata.js');
const event = require('./event.js');

//-------------------------------------------------------------------------------------------
// Routes for our API and facebook webhook
//-------------------------------------------------------------------------------------------
function joinningEventPrint(senderId, eventId, callback) {

  eventData.findByEventID(eventId, (eventDataObject) => {
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
        // TODO: Page user banned from this publication
        callback('Désolé, mais vous êtes bannis de ce groupe');
      } else if (join) {
        // TODO: Send html page with printing description
        callback();
      } else {
        event.eventByEventId(eventId, (eventObj) => {
          if (eventObj.password) {
            // TODO: Ask for password page
            callback("Cette publication est privée, veuillez d'abord joindre cette publication avant de l'imprimer");
          } else {
            eventData.addSenderIdToJoinUsers(eventId, senderId, () => {
              // TODO: Send html page with printing description
              callback();
            });
          }
        });
      }
    } else {
      console.log('Erreur eventDataObject', JSON.stringify(eventDataObject));
      callback('Erreur, veuillez contacter le support technique ou réessayer ulterieurement');
    }
  });
}

module.exports = (app) => {
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
    fbsettings.add();
    res.sendStatus(200);
  });

  app.get('/messenger/removethread', (req, res) => {
    fbsettings.remove();
    res.sendStatus(200);
  });

  // Check connection
  app.get('/messenger/checkserver', (req, res) => {
    console.log('Server connexion OK !');
    res.sendStatus(200);
  });

  // Facebook Webhook
  app.post('/messenger/webhook', (req, res) => {
    msg.handle(req.body);
    res.sendStatus(200);
  });

  app.post('/messenger/uploads', (req, res) => {
    // Ajoute l'image dans la base attach
    attach.addNew(req, (attachObject) => {
      // Affiche la page recap des image uploadées
      res.render('upload', {
        eventImage: attachObject,
      });
    });
  });

  app.post('/messenger/uploadcover', (req, res) => {
    user.addCoverToContext(req, (attachObjet) => {
      res.render('uploadcover', {
        eventImage: attachObjet,
        senderid: req.body.senderid,
      });
    });
  });

  app.get('/messenger/uploadcover/:senderid', (req, res) => {
    res.sendStatus(200);
    function addEvent(senderId) {
      return function () {
        console.log('Run endAddEvent');
        msg.endAddEvent(senderId);
      };
    }
    setTimeout(addEvent(req.params.senderid), 1000);
  });

  app.get('/messenger/newevent/:senderid/', (req, res) => {
    res.render('cover', {
      senderid: req.params.senderid,
    });
  });

  app.get('/messenger/camera/:senderid/:eventid/', (req, res) => {
    res.render('camera', {
      eventid: req.params.eventid,
      senderid: req.params.senderid,
    });
  });

  app.get('/messenger/gallery/:eventid/', (req, res) => {
    attach.validateListByEventId(req.params.eventid, (attachArray) => {
      if (attachArray === false) {
        msg.send('Aucune photo validée dans la gallerie, désolé...');
      } else {
        res.render('gallery', {
          eventImage: attachArray,
        });
      }
    });
  });

  app.get('/messenger/photo/valide/:eventid/:attachid/', (req, res) => {
    attach.valide(req.params.eventid, req.params.attachid, () => {
      attach.toValidate(req.params.eventid, (photoObj) => {
        res.render('phototovalidate', {
          eventImage: photoObj,
        });
      });
    });
  });

  app.get('/messenger/photo/notvalide/:eventid/:attachid/', (req, res) => {
    attach.notValide(req.params.eventid, req.params.attachid, () => {
      attach.toValidate(req.params.eventid, (photoObj) => {
        res.render('phototovalidate', {
          eventImage: photoObj,
        });
      });
    });
  });

  app.route('/messenger/print/create/:senderid/')
    .get((req, res) => {
      print.listBySenderId(req.params.senderid, (listEvent) => {
        res.render('printselect', {
          proPublicat: listEvent.eventPro,
          parPublicat: listEvent.eventPar,

        });
      });
    });

  app.get('/messenger/print/select/:senderid/:eventid/', (req, res) => {
    const senderId = req.params.senderid;
    const eventId = req.params.eventid;
    joinningEventPrint(senderId, eventId, (err) => {
      if (err) {
        res.render('message', { message: err });
      } else {
        print.addNew(eventId, (printData) => {
          res.render('printevent', {
            publication: printData,
            senderid: senderId,
          });
        });
      }
    });
  });

  app.route('/messenger/print/order')
    .get((req, res) => {
      console.log('Peecho async request:', req);
      peecho.checkSecret(req.query, (check) => {
        if (check) {
          print.updateOrder(req.query, () => {
            console.log('Ok start magazine generation and send back url of pdf to peecho');
          });
        } else {
          console.log('Invalide peecho print order request');
        }
      });
      res.sendStatus(200);
    })
    .post((req, res) => {
      console.log('request:', req.body);
      print.updatePreOrder(req.body, () => {
        res.sendStatus(200);
      });
    });

  app.route('/messenger/photo/tovalidate/:eventid/')
    .get((req, res) => {
      attach.toValidate(req.params.eventid, (photoObj) => {
        res.render('phototovalidate', {
          eventImage: photoObj,
        });
      });
    });
};
