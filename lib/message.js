// Import
const fb = require('fbmessenger');
// Configuration du webhook facebook
const messenger = new fb.Messenger({
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
});

// web page setup
const sslRootUrl = process.env.WEB_ADRESSE;
const sslWebUrl = `${sslRootUrl}/messenger`;
const event = require('./event.js');
const User = require('../models/users');
const user = require('./user.js');
const async = require('async');

// google phone checker
// Require `PhoneNumberFormat`.
const PNF = require('google-libphonenumber').PhoneNumberFormat;
// Get an instance of `PhoneNumberUtil`.
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();


const messageFb = module.exports = {
  handle: body => messenger.handle(body),
  send: (msgText, callback) => {
    messenger.send({ text: msgText }).then((res) => {
      console.log(`sending Message: ${JSON.stringify(res)}`);
      if (typeof callback === 'function') {
        callback();
      }
    }).catch((err) => {
      console.error(`Erreur: ${err}`);
    });
  },
  sendByID: (msgText, senderId, callback) => {
    messenger.send({ text: msgText }, senderId).then((res) => {
      console.log(`sending Message: ${JSON.stringify(res)}`);
      if (typeof callback === 'function') {
        callback();
      }
    }).catch((err) => {
      console.error(`Erreur: ${err}`);
    });
  },
  start: () => {
    const messageText = "Ceci est une version Beta public.\n N'hesitez pas à nous signaler tout bug.";
    // const messageText = "Bienvenue";
    messenger.send({ text: messageText })
    .then(() => {
      messenger.send(
        new fb.GenericTemplate([
          new fb.Element({
            title: 'Créer une nouvelle publication',
            image_url: `${sslRootUrl}/images/square/add_event.png`,
            subtitle: 'Créez et personnaliser votre nouvelle publication.',
            buttons: [
              new fb.Button({ type: 'postback', title: 'CREER', payload: 'NEW_EVENT' }),
            ],
          }),
          new fb.Element({
            title: 'Rejoindre une publication',
            image_url: `${sslRootUrl}/images/square/librairie.png`,
            subtitle: 'Participer à une publication ou gerer votre publication.',
            buttons: [
              new fb.Button({ type: 'postback', title: 'PARTAGER', payload: 'PARTI_EVENEMENT' }),
            ],
          }),
          new fb.Element({
            title: 'Imprimer une publication',
            image_url: `${sslRootUrl}/images/square/print.png`,
            subtitle: "Commander le magazine d'une publication.",
            buttons: [
              new fb.Button({ type: 'postback', title: 'IMPRIMER', payload: 'START_PRINT' }),
            ],
          }),
        ])
      ).then(() => {
        messenger.send({ text: 'Faites votre choix: CREER, PARTAGER ou IMPRIMER' })
        .catch((err) => {
          console.error(`Erreur: ${err}`);
        });
      });
    });
  },
  confirmMobile: (mobileNumber) => {
    const conqr1 = new fb.QuickReply({ title: 'Oui', payload: `CONF_MOBILE#${phoneUtil.format(mobileNumber, PNF.E164)}`, image_url: `${sslRootUrl}/images/circle/yes.png` });
    const conqr2 = new fb.QuickReply({ title: 'Non', payload: 'MOBILE_REQUEST', image_url: `${sslRootUrl}/images/circle/no.png` });
    const conqrs = new fb.QuickReplies([conqr1, conqr2]);

    messenger.send(Object.assign(
        { text: `Votre numéro de mobile est bien le ${phoneUtil.format(mobileNumber, PNF.NATIONAL)}` },
        conqrs
      )
    );
  },
  checkIfSMS: () => {
    const cheqr1 = new fb.QuickReply({ title: 'Oui', payload: 'CHECK_SMS_OUI' });
    const cheqr2 = new fb.QuickReply({ title: 'Non', payload: 'CHECK_SMS_NON' });
    const cheqrs = new fb.QuickReplies([cheqr1, cheqr2]);
    messenger.send(Object.assign(
        { text: `Avez-vous reçu le code d'invitation par SMS ?` },
        cheqrs
      )
    );
  },
  choixAddEvent: () => {
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
      if (err) throw Error('Error choixAddEvent', err);
    });
  },
  choixPassword: () => {
    const addEventqr1 = new fb.QuickReply({
      title: 'Oui',
      payload: 'SET_PASSWORD',
      image_url: `${sslRootUrl}/images/circle/yes.png`,
    });
    const addEventqr2 = new fb.QuickReply({
      title: 'Non',
      payload: 'VAL_EVENT',
      image_url: `${sslRootUrl}/images/circle/no.png`,
    });
    const addEventqr = new fb.QuickReplies([addEventqr1, addEventqr2]);
    messenger.send(Object.assign(
      { text: 'Voulez-vous mettre un code pour acceder à votre publication?' },
      addEventqr
    )).catch((err) => {
      if (err) throw Error('Error message.endAddEvent', err);
    });
  },
  endAddEvent: (senderId) => {
    user.getContext(senderId, (userContext) => {
      messenger.send(
        new fb.GenericTemplate([
          new fb.Element({
            title: 'Couverture de publication',
            image_url: userContext.welcome_msg.photo.thumbnail_url,
            subtitle: 'Ceci est votre couverture de publication',
          }),
        ]), senderId
      ).then(() => {
        const addEventqr1 = new fb.QuickReply({
          title: 'Non',
          payload: 'COVER_SELECT',
          image_url: `${sslRootUrl}/images/circle/edit_event.png`,
        });
        const addEventqr2 = new fb.QuickReply({
          title: 'Oui',
          payload: 'RECAP_EVENT',
          image_url: `${sslRootUrl}/images/circle/validate.png`,
        });
        const addEventqr = new fb.QuickReplies([addEventqr1, addEventqr2]);
        messenger.send(Object.assign(
          { text: 'Valider votre couverture de publication ?' },
          addEventqr
        ), senderId).catch((err) => {
          if (err) throw Error('Error message.endAddEvent', err);
        });
      }).catch((err) => {
        if (err) throw Error('Error message.endAddEvent.GenericTemplate', err);
      });
    });
  },
  configEventMenu: (senderId) => {
    messageFb.send("Choix de l'image de couverture", () => {
      messenger.send(
        new fb.GenericTemplate([
          new fb.Element({
            title: 'Couverture de la publication',
            image_url: `${sslRootUrl}/images/square/add_photo.png`,
            subtitle: `Selection de l'image de couverture de votre publication`,
            buttons: [
              new fb.Button({
                type: 'web_url',
                title: 'AJOUTER',
                url: `${sslWebUrl}/newevent/${senderId}/`,
                webview_height_ratio: 'full',
                messenger_extensions: true,
              }),
              new fb.Button({ type: 'postback', title: 'AIDE', payload: 'help' }),
            ],
          }),
        ])
      ).then(() => {

      }).catch((err) => {
        if (err) throw Error('Error configEventMenu', err);
      });
    });
  },
  recapEvent: (userObj) => {
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
            item_url: `https://monmagazine.fr/messenger/proxied_image/${context.welcome_msg.cover_public_id}`,
            image_url: context.welcome_msg.photo.eager[0].secure_url,
            subtitle: context.welcome_msg.texte,
            buttons: buttonsArray,
          }),
        ])
      ).then(() => {
        // console.log('Debug: ', JSON.stringify(res1));
        const eventqr1 = new fb.QuickReply({ title: 'Je valide', payload: 'ASK_PASSWORD', image_url: `${sslRootUrl}/images/circle/validate.png` });
        const eventqr2 = new fb.QuickReply({ title: 'Je modifie', payload: 'NEW_EVENT', image_url: `${sslRootUrl}/images/circle/edit_event.png` });
        const eventqrs = new fb.QuickReplies([eventqr1, eventqr2]);

        messenger.send(Object.assign(
            { text: 'Faites votre choix:' },
            eventqrs
          ));
      });
    });
  },
  menuPhoto: (senderId, eventId) => {
    event.checkIfModerator(senderId, eventId, (admin) => {
      if (admin) { // utilisateur moderateur
        event.checkCloture(eventId, (eventObj) => {
          if (eventObj.event_cloture) {
            messenger.send({
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'list',
                  top_element_style: 'compact',
                  elements: [{
                    title: 'Previsualisation du magazine',
                    image_url: `${sslRootUrl}/images/square/cloture.png`,
                    subtitle: `Feuilleter les pages du magazine de la publication.`,
                    default_action: {
                      type: 'web_url',
                      url: `${sslWebUrl}/preview/pdf/${eventObj.event_printId}`,
                      messenger_extensions: true,
                      webview_height_ratio: 'full',
                    },
                  },
                  {
                    title: 'Commander le magazine',
                    image_url: `${sslRootUrl}/images/square/print.png`,
                    subtitle: `Choisir le format et imprimer le magazine de la publication.`,
                    default_action: {
                      type: 'web_url',
                      url: `${sslWebUrl}/print/select/${senderId}/${eventId}`,
                      messenger_extensions: true,
                      webview_height_ratio: 'full',
                    },
                  },
                  ],
                  buttons: [{
                    title: 'AIDE',
                    type: 'postback',
                    payload: 'help',
                  }],
                },
              },
            }, senderId);
          } else {
            messenger.send({
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'list',
                  top_element_style: 'compact',
                  elements: [{
                    title: 'Ajouter une photo',
                    image_url: `${sslRootUrl}/images/square/add_photo.png`,
                    subtitle: 'Sélectionner la photo à soumettre et ajouter un commentaire',
                    default_action: {
                      type: 'web_url',
                      url: `${sslWebUrl}/camera/${senderId}/${eventId}`,
                      messenger_extensions: true,
                      webview_height_ratio: 'full',
                    },
                  },
                  {
                    title: 'Validation photo',
                    image_url: `${sslRootUrl}/images/square/validate.png`,
                    subtitle: `Validation des photos et commentaires de votre publication`,
                    default_action:
                    {
                      type: 'web_url',
                      url: `${sslWebUrl}/photo/tovalidate/${eventId}`,
                      messenger_extensions: true,
                      webview_height_ratio: 'full',
                    },
                  },
                  {
                    title: 'Gestion publication',
                    image_url: `${sslRootUrl}/images/square/settings.png`,
                    subtitle: `Modifier, supprimer et clôturer la publication.`,
                    default_action:
                    {
                      type: 'web_url',
                      url: `${sslWebUrl}/cloture/${senderId}/${eventId}`,
                      messenger_extensions: true,
                      webview_height_ratio: 'full',
                    },
                  },
                  ],
                  buttons: [{
                    title: 'AIDE',
                    type: 'postback',
                    payload: 'help',
                  }],
                },
              },
            }, senderId);
          }
        });
      } else { // utilidateur participant
        event.checkCloture(eventId, (eventObj) => {
          if (eventObj.event_cloture) {
            messenger.send({
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'list',
                  top_element_style: 'compact',
                  elements: [{
                    title: 'Previsualisation du magazine',
                    image_url: `${sslRootUrl}/images/square/cloture.png`,
                    subtitle: `Feuilleter les pages du magazine de la publication.`,
                    default_action: {
                      type: 'web_url',
                      url: `${sslWebUrl}/preview/pdf/${eventObj.event_printId}`,
                      messenger_extensions: true,
                      webview_height_ratio: 'full',
                    },
                  },
                  {
                    title: 'Commander le magazine',
                    image_url: `${sslRootUrl}/images/square/print.png`,
                    subtitle: `Imprimer le magazine de la publication.`,
                    default_action: {
                      type: 'web_url',
                      url: `${sslWebUrl}/print/select/${senderId}/${eventId}`,
                      messenger_extensions: true,
                      webview_height_ratio: 'full',
                    },
                  },
                  ],
                  buttons: [{
                    title: 'AIDE',
                    type: 'postback',
                    payload: 'help',
                  }],
                },
              },
            }, senderId);
          } else {
            messenger.send({
              attachment: {
                type: 'template',
                payload: {
                  template_type: 'list',
                  top_element_style: 'compact',
                  elements: [{
                    title: 'Ajouter une photo',
                    image_url: `${sslRootUrl}/images/square/add_photo.png`,
                    subtitle: 'Sélectionner la photo à soumettre et ajouter un commentaire',
                    default_action: {
                      type: 'web_url',
                      url: `${sslWebUrl}/camera/${senderId}/${eventId}`,
                      messenger_extensions: true,
                      webview_height_ratio: 'full',
                    },
                  }, {
                    title: 'Collection photo',
                    image_url: `${sslRootUrl}/images/square/collection.png`,
                    subtitle: `Gallerie des photos soumises et validées de l'évènement`,
                    default_action: {
                      type: 'web_url',
                      url: `${sslWebUrl}/gallery/${eventId}`,
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
            }, senderId);
          }
        });
      }
    });
  },
  welcomeToEvent: (eventObject, callback) => {
    let recapEventText = '';

    if (eventObject.password) {
      recapEventText = `Bienvenue dans l'évènement\n ${eventObject.event_info.name}\n Code d'accès: ${eventObject.password}`;
    } else {
      recapEventText = `Bienvenue dans l'évènement\n ${eventObject.event_info.name}`;
    }
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
            item_url: `https://monmagazine.fr/messenger/proxied_image/${eventObject.cover_public_id}`,
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
  },
  eventSearchResult: (hitList, callback) => {
    const hitListElements = [];

    async.each(hitList, (hit, callback) => {
      hitListElements.push(
        new fb.Element({
          title: hit.event_info.name,
          item_url: `https://monmagazine.fr/messenger/proxied_image/${hit.cover_public_id}`,
          image_url: hit.welcome_msg.photo,
          subtitle: hit.event_info.description,
          buttons: [
            new fb.Button({ type: 'postback', title: 'REJOINDRE', payload: `JOIN_EVENT#${hit._id}` }),
          ],
        })
      );
      callback();
    }, (err) => {
      if (err) throw Error(`Error in  message.eventSearchPrintResult.async.each: ${err}`);

      messenger.send(
        new fb.GenericTemplate(hitListElements)
      ).then(() => {
        callback();
      });
    });
  },
  eventSearchPrintResult: (senderId, hitList, callback) => {
    const hitListElements = [];

    async.each(hitList, (hit, callback) => {
      hitListElements.push(
        new fb.Element({
          title: hit.event_info.name,
          image_url: hit.welcome_msg.photo,
          subtitle: hit.event_info.description,
          buttons: [
            new fb.Button({ type: 'web_url', title: 'IMPRIMER', url: `${sslWebUrl}/print/select/${senderId}/${hit._id}` }),
          ],
        })
      );
      callback();
    }, (err) => {
      if (err) throw Error(`Error in  message.eventSearchPrintResult.async.each: ${err}`);

      messenger.send(
        new fb.GenericTemplate(hitListElements)
      ).then(() => {
        callback();
      });
    });
  },
  printingMenu: (senderId) => {
    messenger.send(
      new fb.GenericTemplate([
        new fb.Element({
          title: 'Commander un magazine',
          item_url: `${sslWebUrl}/print/create/${senderId}/`,
          image_url: `${sslRootUrl}/images/square/collection.png`,
          subtitle: `Choisissez votre publication et commandez la !`,
          buttons: [{
            title: 'AIDE',
            type: 'postback',
            payload: 'help',
          },
          {
            title: 'IMPRIMER',
            type: 'web_url',
            url: `${sslWebUrl}/print/create/${senderId}/`,
            webview_height_ratio: 'full',
          },
          ],
        }),
      ])
    );
  },
  receiveMessage: (msgText) => {
    console.log(`Message received: ${JSON.stringify(msgText)}`);
    let payload = 'DEFAULT';
    // Payload quick replies

    if ('postback' in msgText && msgText.postback.payload) {
      // Passage de parametre dans le payload
      if (msgText.postback.payload.indexOf('#')) {
        payload = msgText.postback.payload.split('#', 1)[0];
      } else {
        payload = msgText.postback.payload;
      }
      actionCall(payload, msgText);
    } else if ('quick_reply' in msgText.message) {
      if ('payload' in msgText.message.quick_reply) {
        // Passage de parametre dans le payload
        if (msgText.message.quick_reply.payload.indexOf('#')) {
          payload = msgText.message.quick_reply.payload.split('#', 1)[0];
        } else {
          payload = msgText.message.quick_reply.payload;
        }
      }
      actionCall(payload, msgText);
    } else if ('text' in msgText.message || 'attachments' in msgText.message) {
      User.findOne({ senderid: msgText.sender.id }, (err, userObj) => {
        if (err) throw Error(`Error in findOne senderId: ${err}`);

        if (userObj) { // User exist
          payload = userObj.next_payload;
        }
        actionCall(payload, msgText);
      });
    } else {
      // Take action !!
      actionCall(payload, msgText);
    }
  },
  getUser: senderId => messenger.getUser(senderId),
};

//------------------------------------------------------------------------------------------------
// On Events
//------------------------------------------------------------------------------------------------
// postback Calls
messenger.on('postback', (msgText) => {
  messageFb.receiveMessage(msgText);
  // console.log('Messenger postback: ', JSON.stringify(messenger));
});

// Action lors de la reception d'un message
messenger.on('message', (msgText) => {
  messageFb.receiveMessage(msgText);
  // console.log('Messenger regular: ', JSON.stringify(messenger));
});

const actionCall = require('./action.js');
