// Import
const msg = require('./message.js');
const fbsettings = require('./threadSettings.js');
const attach = require('./attach.js');
const print = require('./print.js');
const peecho = require('./peecho.js');
const user = require('./user.js');
const event = require('./event.js');
const order = require('./order.js');
const email = require('./email.js');
const request = require('request');
const cloudinary = require('cloudinary');


cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});
//-------------------------------------------------------------------------------------------
// Routes for our API and facebook webhook
//-------------------------------------------------------------------------------------------

function joinningEventPrint(senderId, eventId, callback) {
  event.findByEventID(eventId, (eventObject) => {
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
            event.addSenderIdToJoinUsers(eventId, senderId, () => {
              // TODO: Send html page with printing description
              callback();
            });
          }
        });
      }
    } else {
      console.log('Erreur eventDataObject', JSON.stringify(eventObject));
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
  app.get('/messenger/checkserver/:printid', (req, res) => {
    console.log('Server connexion OK !');
    print.findById(req.params.printid, (printObj) => {
      print.generatePdfPhantomjs(printObj, () => {
        res.sendStatus(200);
      });
    });
    // res.sendStatus(200);
  });

  // Facebook Webhook
  app.post('/messenger/webhook', (req, res) => {
    msg.handle(req.body);
    res.sendStatus(200);
  });

  app.post('/messenger/uploads', (req, res) => {
    event.checkCloture(req.body.eventid, (eventObj) => {
      if (eventObj.event_cloture) {
        res.render('message', { message: "Cette publication est déjà cloturée! Vous ne pouvez plus ajouter de photos." });
      } else {
        // Ajoute l'image dans la base attach
        attach.addNew(req, (attachObject) => {
          if (attachObject) {
            // Affiche la page recap des image uploadées
            res.render('upload', {
              eventImage: attachObject,
            });
          } else {
            res.render('message', { message: "Malheureusement, une erreur est servenue. Votre image n'est pas enregistrée. Veuillez vérifier votre connexion internet et réessayer ulterieurement ou contactez le service technique. Merci." });
          }
        });
      }
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
    const senderId = req.params.senderid;
    user.testNextpayload(senderId, "ADD_EVENT", (payloadTest) => {
      if (payloadTest) {
        res.render('cover', {
          senderid: senderId,
        });
      } else {
        res.render('message', { message: "Malheureusement cette opération est impossible, désolé..." });
      }
    });
  });

  app.get('/messenger/camera/:senderid/:eventid/', (req, res) => {
    res.render('camera', {
      eventid: req.params.eventid,
      senderid: req.params.senderid,
      layout: 'spectrecss',
    });
  });

  app.get('/messenger/gallery/:eventid/', (req, res) => {
    attach.validateListByEventId(req.params.eventid, (attachArray) => {
      if (attachArray === false) {
        res.render('message', { message: 'Aucune photo validée dans la gallerie, désolé...' });
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

  app.get('/messenger/print/select/:senderid/:eventid/', (req, res) => {
    const senderId = req.params.senderid;
    const eventId = req.params.eventid;
    joinningEventPrint(senderId, eventId, (err) => {
      if (err) {
        res.render('message', { message: err });
      } else {
        event.eventByEventId(eventId, (eventObj) => {
          if (eventObj.event_cloture) {
            print.findById(eventObj.event_printId, (printObj) => {
              order.addNew(senderId, eventId, printObj._id, (orderObj) => {
                res.render('printevent', {
                  publication: printObj,
                  senderid: senderId,
                  orderId: orderObj._id,
                });
              });
            });
          } else {
            res.render('message', { message: "Désolé mais cette publication n'a pas encore été clôturé et ne peut pas étre imprimée." });
          }
        });
      }
    });
  });

  app.route('/messenger/print/order')
    .get((req, res) => {
      peecho.checkSecret(req.query, (check) => {
        const fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;
        console.log('Peecho fullUrl call:', fullUrl);
        console.log('Check: ', check);
        if (check) {
          order.update(req.query, fullUrl, (orderObj) => {
            console.log('Ok start magazine generation...');
            print.findById(orderObj.printid, (printObj) => {
              peecho.sendPdfUrl(orderObj, printObj.pdfUrl, (peechoRes) => {
                order.updatePeechoRes(orderObj._id, peechoRes);
                if (peechoRes.statusCode === 400) {
                  throw Error(`OrderId: ${orderObj._id} PdfUrl: ${printObj.pdfUrl}`);
                }
              });
            });
          });
        } else {
          console.log('Invalide peecho print order request');
        }
      });
      res.sendStatus(200);
    })
    .post((req, res) => {
      order.updateStatus(req.body.orderid, () => {
        res.sendStatus(200);
      });
    });

  app.get('/messenger/view/pdf/:printid', (req, res) => {
    print.findById(req.params.printid, (printObj) => {
      if (printObj) {
        res.render('pdflayout', {
          print: [{
            mainUrl: "https://monmagazine.fr/messenger/",
            eventId: printObj.eventId,
            cover_public_id: printObj.cover_public_id,
            printTitle: printObj.printTitle,
            description: printObj.event_info.description,
            welcome_text: printObj.welcome_msg.texte,
            photoList: printObj.photoList,
          }],

          layout: 'mainprint',
        });
      } else {
        res.sendStatus(400);
      }
    });
  });

  app.get('/messenger/preview/pdf/:printid', (req, res) => { // TODO: faire une verification avec senderid
    print.findById(req.params.printid, (printObj) => {
      if (printObj) {
        res.render('pdfpreview', {
          pdfUrl: printObj.pdfUrl,
          layout: 'pdfpreviewcss',
        });
      }
    });
  });

  app.get('/messenger/cloture/:senderid/:eventid/', (req, res) => {
    event.checkCloture(req.params.eventid, (eventObj) => {
      if (eventObj.event_cloture) {
        res.render('message', { message: 'Publication déja clôturée.' });
      } else {
        attach.validateListByEventId(req.params.eventid, (attachObj) => {
          if (attachObj === false) {
            res.render('message', { message: 'Aucune photo validée dans la gallerie, désolé...' });
          } else {
            res.render('cloture', {
              eventImage: attachObj,
              eventid: req.params.eventid,
              senderid: req.params.senderid,
              layout: 'spectrecss',
            });
          }
        });
      }
    });
  });

  app.post('/messenger/cloture/close/:senderid/:eventid', (req, res) => {
    console.log('Debut cloture');
    const senderId = req.params.senderid;
    const eventId = req.params.eventid;
    const photoArray = req.body.photoArray;
    if (photoArray.length < 14) {
      res.status(200).send('Il faut un minimum de 14 photos pour cloturer la publication.');
    } else if (photoArray.length > 500) {
      res.status(200).send('Il faut un maximun de 500 photos pour cloturer la publication.');
    } else {
      print.cloture(senderId, eventId, req.body.photoArray, (printObj) => {
        if (printObj) {
          res.status(200).send("Felicitation, votre Publication est cloturée!");
        } else {
          res.status(400).send("Une erreur est survenu... la publication n'a pas été cloturée.");
        }
      });
    }
  });

  app.get('/messenger/print/thankyou', (req, res) => {
    res.render('message', { message: 'Merci, vous receverez un email de confirmation de commande.' });
  });

  app.get('/messenger/proxied_image/:public_id', (req, res) => {
    // Proxied image
    const publicId = req.params.public_id;

    attach.tranformeByPublicID(publicId, (transform) => {
      let uri = "";

      if (transform) {
        uri = cloudinary.url(`${publicId}.png`, { transformation: transform[0], quality: "auto:eco", radius: 20, width: 800, crop: "scale" });
      } else {
        uri = cloudinary.url(`${publicId}.png`, { quality: "auto:eco", radius: 20, width: 800, crop: "scale" });
      }
      request.get(uri).pipe(res);
    });
  });

  app.get('/messenger/full_image/cover/:public_id', (req, res) => {
    // Proxied image
    const publicId = req.params.public_id;
    const uri = cloudinary.url(`${publicId}.jpg`, { transformation: ["A4-portrait"] });
    request.get(uri).pipe(res);
  });

  app.get('/messenger/full_image/landscape/:public_id', (req, res) => {
    // Proxied image
    const publicId = req.params.public_id;
    attach.tranformeByPublicID(publicId, (transform) => {
      let uri = "";
      if (transform) {
        uri = cloudinary.url(`${publicId}.png`, { transformation: transform[0], effect: "improve" });
      } else {
        uri = cloudinary.url(`${publicId}.jpg`, { transformation: ["landscape"] });
      }
      request.get(uri).pipe(res);
    });
  });

  app.get('/messenger/full_image/portrait/:public_id', (req, res) => {
    // Proxied image
    const publicId = req.params.public_id;
    attach.tranformeByPublicID(publicId, (transform) => {
      let uri = "";
      if (transform) {
        uri = cloudinary.url(`${publicId}.png`, { transformation: transform[0], effect: "improve" });
      } else {
        uri = cloudinary.url(`${publicId}.jpg`, { transformation: ["portrait"] });
      }
      request.get(uri).pipe(res);
    });
  });

  app.get('/messenger/profile_image/:public_id', (req, res) => {
    // Proxied image
    const publicId = req.params.public_id;
    const uri = cloudinary.url(`${publicId}.png`,
      { width: 200, height: 200, gravity: "face", radius: "max", crop: "thumb" }
    );
    // console.log('Image proxie Filepath: ', uri);
    // req.pipe(request(uri)).pipe(res);
    request.get(uri).pipe(res);
  });

  app.route('/messenger/photo/tovalidate/:eventid/')
    .get((req, res) => {
      attach.toValidate(req.params.eventid, (photoObj) => {
        res.render('phototovalidate', {
          eventImage: photoObj,
        });
      });
    });
  app.route('/messenger/contact/')
    .get((req, res) => {
      res.render('contact', { mailgunPubkey: process.env.MAILGUN_PUBKEY, layout: 'spectrecss' });
    })
    .post((req, res) => {
      console.log('username:', req.body);
      email.sendmail(req.body, (info) => {
        console.log('info:', info);
      });
      res.sendStatus(200);
    });
};
