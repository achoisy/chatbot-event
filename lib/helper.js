const helper = module.exports = {
  preOrder: (mydata) => {
    console.log('this._id: ', mydata);
    return `Ca marche!! ${JSON.stringify(mydata)}`;
  },
  pageNumber: (eventId) => {
    return '16';
  },
  thumbnail: (eventId) => {
    return '';
  },
  width: (eventId) => {
    return '210';
  },
  height: (eventId) => {
    return '297';
  },
  reference: (eventId) => {
    return eventId;
  },
};
