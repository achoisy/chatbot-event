
const helper = module.exports = {
  printButtonPortrait: (printObj) => {
    const printButton = `<div class="col s12">
      <a title='MonMagazine.fr' href='http://www.peecho.com/'
      class='peecho-print-button'
      data-filetype='pdf'
      data-width='${printObj.pdfWidth}'
      data-height='${printObj.pdfHeight}'
      data-pages='${printObj.pageCount}'
      data-thumbnail='${printObj.welcome_msg.photo}'
      data-locale="fr_FR"
      data-theme="blue"
      data-text="IMPRIMER à partir de "
      data-reference='${printObj._id}'
      data-title='${printObj.event_info.name}'
      data-src=''
      >PDF book on demand</a>
    </div> `;
    return printButton;
  },
  printButtonPaysage: (printObj) => {
    const printButton = `<div class="col s12">
      <a title='MonMagazine.fr' href='http://www.peecho.com/'
      class='peecho-print-button'
      data-filetype='pdf'
      data-width='${printObj.pdfHeight}'
      data-height='${printObj.pdfWidth}'
      data-pages='${printObj.pageCount}'
      data-thumbnail='${printObj.welcome_msg.photo}'
      data-locale="fr_FR"
      data-theme="blue"
      data-text="IMPRIMER à partir de "
      data-reference='${printObj._id}'
      data-title='${printObj.event_info.name}'
      data-src=''
      >PDF book on demand</a>
    </div> `;
    return printButton;
  },
};
