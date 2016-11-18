// Import
const fbsettings = require('./threadSettings.js');
const attach = require('./attach.js');
const message = require('./message.js');

// Import
const fb = require('fbmessenger');

const messenger = new fb.Messenger({
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
});
//-------------------------------------------------------------------------------------------
// Routes for our API and facebook webhook
//-------------------------------------------------------------------------------------------

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
    res.sendStatus(200);
    messenger.handle(req.body);
  });

  app.post('/messenger/uploads', (req, res) => {
    // res.sendStatus(200);
    const transloaditResponse = JSON.parse(req.body.transloadit);
    // console.log('transloadit: ', transloadit.fields);

    // Ajoute l'image dans la base attach
    attach.addNew(transloaditResponse, (attachObject) => {
      // Affiche la page recap des image uploadées
      res.render('upload', {
        senderid: attachObject.userid,
        eventid: attachObject.eventid,
        senderImage: [
          {
            thumbnail_url: attachObject.thumbnail_url,
            message: attachObject.message,
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
    attach.listByEventId(req.params.eventid, (attachArray) => {
      if (attachArray === false) {
        message.send('Aucune photo dans la gallerie, désolé...');
      } else {
        res.render('gallery', {
          eventImage: attachArray,
        });
      }
    });
  });
};