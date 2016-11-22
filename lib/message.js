// Import
const fb = require('fbmessenger');
// Configuration du webhook facebook
const messenger = new fb.Messenger({
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
});

// web page setup
const sslRootUrl = process.env.WEB_ADRESSE;
const sslWebUrl = `${sslRootUrl}/messenger`;

const User = require('../models/users');

// google phone checker
// Require `PhoneNumberFormat`.
const PNF = require('google-libphonenumber').PhoneNumberFormat;
// Get an instance of `PhoneNumberUtil`.
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();


const messageFb = {
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
  start: () => {
    messenger.send(
      new fb.GenericTemplate([
        new fb.Element({
          title: 'Participer à une publication',
          image_url: `${sslRootUrl}/images/square/join_event.png`,
          subtitle: "Si Vous êtes invités à participer à une publication",
        }),
        new fb.Element({
          title: 'Creer une nouvelle publication',
          image_url: `${sslRootUrl}/images/square/add_event.png`,
          subtitle: "Créez votre nouvelle publication et gérer les photos et commentaires.",
        }),
      ])
    ).then((res) => {
      const demqr1 = new fb.QuickReply({ title: `Je crée`, payload: 'NEW_EVENT', image_url: `${sslRootUrl}/images/circle/add_event.png` });
      // const qr2 = new fb.QuickReply({ title: 'MODIFIER', payload: 'MODIF_EVENEMENT'});
      const demqr2 = new fb.QuickReply({ title: 'Je participe', payload: 'PARTI_EVENEMENT', image_url: `${sslRootUrl}/images/circle/join_event.png` });
      const demqrs = new fb.QuickReplies([demqr2, demqr1]);
      messenger.send(Object.assign(
          { text: 'Faites votre choix:' },
          demqrs
        )
      );
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
  },
  photoMenu: (senderId, eventId) => {
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
              url: `${sslWebUrl}/camera/${senderId}/${eventId}`,
              messenger_extensions: true,
              webview_height_ratio: 'full',
            },
          }, {
            title: 'Gallerie photo',
            image_url: `${sslRootUrl}/images/square/collection.png`,
            subtitle: `Gallerie de photo de l'évènement`,
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
    });
  },
  photoMenuAdmin: (senderId, eventId) => {
    messenger.send({
      attachment: {
        type: 'template',
        payload: {
          template_type: 'list',
          top_element_style: 'compact',
          elements: [
            {
              title: 'Ajouter une photo',
              image_url: `${sslRootUrl}/images/square/add_photo.png`,
              subtitle: 'Prendre une photo ou selectionner des photos à envoyer',
              default_action: {
                type: 'web_url',
                url: `${sslWebUrl}/camera/${senderId}/${eventId}`,
                messenger_extensions: true,
                webview_height_ratio: 'full',
              },
            },
            {
              title: 'Gallerie photo',
              image_url: `${sslRootUrl}/images/square/collection.png`,
              subtitle: `Gallerie de photo de l'évènement`,
              default_action:
              {
                type: 'web_url',
                url: `${sslWebUrl}/gallery/${eventId}`,
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
                url: `${sslWebUrl}/photo/tovalidate/${eventId}`, // TODO: faire la page
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
    });
  },
  welcomeToEvent: (eventObject, callback) => {
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
  },
  eventSearchResult: (hitList, callback) => {
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
      callback();
    });
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

module.exports = messageFb;

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
