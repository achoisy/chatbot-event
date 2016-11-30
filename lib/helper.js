const print = require('./print.js');
const event = require('./event.js');

const helper = module.exports = {
  preOrder: (mydata) => {
    console.log('this._id: ', mydata);
    return `Ca marche!! ${JSON.stringify(mydata)}`;
  },
  printButton: (eventId) => {
    print.addNew(eventId, (printObject) => {
      event.eventByEventId(eventId, (eventObj) => {
        const printButton = `<div class="col s12">
          <a title='MonMagazine.fr' href='http://www.peecho.com/'
          class='peecho-print-button'
          data-filetype='pdf'
          data-width='210'
          data-height='297'
          data-pages='${printObject.pageCount}'
          data-thumbnail='${eventObj.welcome_msg.photo}'
          data-locale="fr_FR"
          data-theme="blue"
          data-text="IMPRIMER à partir de "
          data-reference='${printObject._id}'
          data-title='${eventObj.event_info.name}'
          data-src=''
          >PDF book on demand</a>
        </div> `
      });
    });
  },
};
