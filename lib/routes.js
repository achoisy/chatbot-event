// Import
const msg = require('./message.js');
const fbsettings = require('./threadSettings.js');
const attach = require('./attach.js');
const eventData = require('./eventdata.js');


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
    msg.handle(req.body);
  });

  app.post('/messenger/uploads', (req, res) => {
    // res.sendStatus(200);

    // Ajoute l'image dans la base attach
    attach.addNew(req, (attachObject) => {
      // Affiche la page recap des image uploadées
      res.render('upload', {
        eventImage: attachObject,
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
    console.log('Valide:', req.params.eventid, req.params.attachid);
    attach.valide(req.params.eventid, req.params.attachid, () => {
      attach.toValidate(req.params.eventid, (photoObj) => {
        res.render('phototovalidate', {
          eventImage: photoObj,
        });
      });
    });
  });

  app.get('/messenger/photo/notvalide/:eventid/:attachid/', (req, res) => {
    console.log('notValide:', req.params.eventid, req.params.attachid);
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
      eventData.printListBySenderID(req.params.senderid, (listEvent) => {
        res.render('printselect', {
          proPublicat: listEvent.eventPro,
          parPublicat: listEvent.eventPar,
        });
      });
    });

  app.route('/messenger/photo/tovalidate/:eventid/')
    .post((req, res) => {

    })
    .get((req, res) => {
      attach.toValidate(req.params.eventid, (photoObj) => {
        res.render('phototovalidate', {
          eventImage: photoObj,
        });
      });
    });
};
