
// Import
const fb = require('fbmessenger');
// web page setup
const sslRootUrl = process.env.WEB_ADRESSE;
// const sslWebUrl = `${sslRootUrl}/messenger`;

// Configuration du webhook facebook
const messenger = new fb.Messenger({
  pageAccessToken: process.env.PAGE_ACCESS_TOKEN,
});

// Liste d'url accessible
const WHITELISTED_DOMAINS = [
  'http://chatbotsmaker.fr',
  sslRootUrl,
];

//-------------------------------------------------------------------------------------------------
// Bot Initialisation and configuration
//-------------------------------------------------------------------------------------------------

const threadSettings = {
  add: () => {
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
  },
  remove: () => {
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
  },
};

module.exports = threadSettings;
