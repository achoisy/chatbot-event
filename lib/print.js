const Print = require('../models/prints.js');
const attach = require('./attach.js');
const event = require('./event.js');
const async = require('async');
const speakeasy = require('speakeasy');
const pdf = require('html-pdf');
const requestify = require('requestify');
// const PdfPrinter = require('pdfmake');
const fs = require('fs');
const request = require('request');
const cloudinary = require('cloudinary');
const path = require('path');
const peecho = require('./peecho.js');
const moment = require('moment');
const msg = require('./message.js');

moment.locale('fr'); // 'fr'

// web page setup
const sslRootUrl = process.env.WEB_ADRESSE;
const sslWebUrl = `${sslRootUrl}/messenger`;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

// const printer = new PdfPrinter();

function download(uri, filename, callback) {
  request.head(uri, (err, res, body) => {
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
}

const print = module.exports = {
  cloture: (senderId, eventId, orderedPhotoArray, callback) => {
    event.eventByEventId(eventId, (eventObj) => {
      async.detect(eventObj.moderators, (moderator, callback) => {
        if (moderator === senderId) {
          callback(null, true);
        }
      }, (err, result) => {
        if (result) {
          attach.validateListByArray(orderedPhotoArray, (attachObj) => {
            const photoArray = [];
            if (attachObj) {
              async.eachSeries(attachObj, (obj, callback) => {
                if (photoArray.length >= 1) { // Pas premiere photo
                  if (obj.width > obj.height) { // Photo en paysage
                    if (photoArray[photoArray.length - 1].downPage === 'addphoto') { // Si photo en bas de page
                      photoArray[photoArray.length - 1].downPage = {
                        imageId: obj._id,
                        full_url: obj.full_url,
                        optimiseImageUrl: obj.optimiseImageUrl,
                        author_pic: obj.author_pic,
                        user_profile: obj.user_profile,
                        message: obj.message,
                        public_id: obj.public_id,
                        width: obj.width,
                        height: obj.height,
                        dateTimeOriginal: obj.dateTimeOriginal,
                        dateTimeHumain: moment(obj.dateTimeOriginal).format('LLLL'),
                        landscape: true,
                      };
                    } else { // Photo sur une nouvelle page
                      photoArray.push({
                        upPage: {
                          imageId: obj._id,
                          full_url: obj.full_url,
                          optimiseImageUrl: obj.optimiseImageUrl,
                          author_pic: obj.author_pic,
                          user_profile: obj.user_profile,
                          message: obj.message,
                          public_id: obj.public_id,
                          width: obj.width,
                          height: obj.height,
                          dateTimeOriginal: obj.dateTimeOriginal,
                          dateTimeHumain: moment(obj.dateTimeOriginal).format('LLLL'),
                          landscape: true,
                        },
                        downPage: 'addphoto',
                      });
                    }
                  } else { // Photo en Portrait ou carré
                    if (photoArray[photoArray.length - 1].downPage === 'addphoto') {
                      photoArray[photoArray.length - 1].downPage = false;
                    }
                    photoArray.push({
                      upPage: {
                        imageId: obj._id,
                        full_url: obj.full_url,
                        optimiseImageUrl: obj.optimiseImageUrl,
                        author_pic: obj.author_pic,
                        user_profile: obj.user_profile,
                        message: obj.message,
                        public_id: obj.public_id,
                        width: obj.width,
                        height: obj.height,
                        dateTimeOriginal: obj.dateTimeOriginal,
                        dateTimeHumain: moment(obj.dateTimeOriginal).format('LLLL'),
                        landscape: false,
                      },
                      downPage: false,
                    });
                  }
                } else {
                  // Premiere photo de la serie*
                  if (obj.width > obj.height) { // Photo en paysage
                    photoArray.push({
                      upPage: {
                        imageId: obj._id,
                        full_url: obj.full_url,
                        optimiseImageUrl: obj.optimiseImageUrl,
                        author_pic: obj.author_pic,
                        user_profile: obj.user_profile,
                        message: obj.message,
                        public_id: obj.public_id,
                        width: obj.width,
                        height: obj.height,
                        dateTimeOriginal: obj.dateTimeOriginal,
                        dateTimeHumain: moment(obj.dateTimeOriginal).format('LLLL'),
                        landscape: true,
                      },
                      downPage: 'addphoto',
                    });
                  } else { // Photo en Portrait ou carré
                    photoArray.push({
                      upPage: {
                        imageId: obj._id,
                        full_url: obj.full_url,
                        optimiseImageUrl: obj.optimiseImageUrl,
                        author_pic: obj.author_pic,
                        user_profile: obj.user_profile,
                        message: obj.message,
                        public_id: obj.public_id,
                        width: obj.width,
                        height: obj.height,
                        dateTimeOriginal: obj.dateTimeOriginal,
                        dateTimeHumain: moment(obj.dateTimeOriginal).format('LLLL'),
                        landscape: false,
                      },
                      downPage: false,
                    });
                  }
                }
                callback();
              }, () => {
                if (photoArray[photoArray.length - 1].downPage === 'addphoto') {
                  photoArray[photoArray.length - 1].downPage = false;
                }
                console.log('photoArray:', photoArray);
                const newPrint = new Print({
                  pdfWidth: 210,
                  pdfHeight: 297,
                  photoCount: attachObj.length,
                  pageCount: 2 + attachObj.length,
                  photoList: photoArray,
                  printable: true,
                  eventId: eventObj._id,
                  event_info: eventObj.event_info,
                  welcome_msg: eventObj.welcome_msg,
                  cover_public_id: eventObj.cover_public_id,
                  orientation: "Portrait",
                  printTitle: eventObj.event_info.name,
                  rotation_image: false,
                });
                newPrint.save((err, printObj) => {
                  if (err) throw Error(`Error in print newPrint.save: ${err}`);

                  event.clotureEvent(eventId, printObj._id, () => {
                    print.generatePdfPhantomjs(printObj, () => {
                      event.afterCloture(eventId, (userObjs) => {
                        async.each(userObjs, (userObj, callback) => {
                          console.log(`Sending cloture message to ${userObj.senderid}`);
                          msg.sendByID(`Publication ${printObj.printTitle} clôturée !`, userObj.senderid, () => {
                            console.log(`Sending photoMenu to ${userObj.senderid}`);
                            msg.menuPhoto(userObj.senderid, eventId);
                            callback();
                          });
                        }, (err) => {
                          if (err) throw Error(`event afterCloture.User.find.async.each: ${err}`);
                        });
                      });
                    });
                    callback(printObj);
                  });
                });
              });
            } else {
              callback(false);
            }
          });
        } else {
          callback(false);
        }
      });
    });
  },
  findById: (printId, callback) => {
    Print.findById(printId, (err, printObj) => {
      if (err) throw Error(`Error in print.findById: ${err}`);

      callback(printObj);
    });
  },
  attachDownload: (printObj, callback) => {
    console.log('Start attachDownload');
    async.series({
      eventDirectory: (callback) => {
        const fullpath = path.join(__dirname, '..', `imagestock/${printObj.eventId}/`);
        fs.stat(fullpath, (err, stats) => {
          if (err) {
            fs.mkdir(fullpath,
              callback(null, true));
          } else if (!stats.isDirectory()) {
            // This isn't a directory!
            callback(new Error(`imagestock/${printObj.eventId}/ is not a directory !`));
          } else {
            callback(null, true);
          }
        });
      },
      profilDirectory: (callback) => {
        const fullpath = path.join(__dirname, '..', `imagestock/profile_image/`);
        fs.stat(fullpath, (err, stats) => {
          if (err) {
            fs.mkdir(fullpath,
              callback(null, true));
          } else if (!stats.isDirectory()) {
            // This isn't a directory!
            callback(new Error(`imagestock/profile_image/ is not a directory !`));
          } else {
            callback(null, true);
          }
        });
      },
      profilLocalUri: (callback) => {
        async.forEachSeries(printObj.photoList, (photo, callback) => {
          const filePath = path.join(__dirname, '..', `imagestock/profile_image/${photo.author_pic}.jpg`);
          fs.stat(filePath, (err, stats) => {
            if (err) {
              const uri = cloudinary.url(`${photo.author_pic}.jpg`,
                { width: 200, height: 200, gravity: "face", radius: "max", crop: "thumb" });
              console.log('Filepath: ', uri);
              download(uri, filePath, () => {
                callback(null, true);
              });
            } else if (!stats.isFile()) {
              callback(new Error(`imagestock/profile_image/${photo.author_pic}.jpg is not a File !`));
            } else {
              callback(null, true);
            }
          });
        }, (err) => {
          if (err) {
            callback(new Error(`profilLocalUri.async.forEachSeries.download: ${err}`));
          } else {
            callback(null, true);
          }
        });
      },
      attachLocalUri: (callback) => {
        async.forEachSeries(printObj.photoList, (photo, callback) => {
          const filePath = path.join(__dirname, '..', `imagestock/${printObj.eventId}/${photo.public_id}.jpg`);
          fs.stat(filePath, (err, stats) => {
            if (err) {
              // const uri = cloudinary.url(`${photo.public_id}.jpg`);
              const uri = cloudinary.url(`${photo.public_id}.jpg`, { transformation: ["A4-portrait"] });
              console.log('Filepath: ', uri);
              download(uri, filePath, () => {
                callback(null, true);
              });
            } else if (!stats.isFile()) {
              callback(new Error(`imagestock/${printObj.eventId}/${photo.public_id}.jpg is not a File !`));
            } else {
              callback(null, true);
            }
          });
        }, (err) => {
          if (err) {
            callback(new Error(`Error in file download ${err}`));
          } else {
            callback(null, true);
          }
        });
      },
      coverLocalUri: (callback) => {
        // TODO: Download Cover Image
        const filePath2 = path.join(__dirname, '..', `imagestock/${printObj.eventId}/${printObj.cover_public_id}.jpg`);
        fs.stat(filePath2, (err, stats) => {
          if (err) {
            const uri = cloudinary.url(`${printObj.cover_public_id}.jpg`, { transformation: ["A4-portrait"] });
            download(uri, filePath2, () => {
              callback(null, true);
            });
          } else if (!stats.isFile()) {
            callback(new Error(`imagestock/${printObj.eventId}/${printObj.cover_public_id}.jpg is not a file !`));
          } else {
            callback(null, true);
          }
        });
      },
    }, (err, results) => {
      if (err) throw Error(`Error in print.generatePdf.async.series: ${err}`);
      console.log("Ok for attachdownload", results);
      callback();
    });
  },
  generatePdfPhantomjs: (printObj, callback) => {
    const printHtmlUrl = `${sslWebUrl}/view/pdf/${printObj._id}`;
    console.log('Start generatePdfPhantomjs', printHtmlUrl);
    requestify.get(printHtmlUrl).then((response) => {
      const html = response.body;
      const config = {  // html-pdf config file
        // Papersize Options: http://phantomjs.org/api/webpage/property/paper-size.html
        format: "A4",        // allowed units: A3, A4, A5, Legal, Letter, Tabloid
        orientation: printObj.orientation, // portrait or landscape

        // Page options
        border: {
          top: "5mm",            // default is 0, units: mm, cm, in, px
          right: "5mm",
          bottom: "5mm",
          left: "5mm",
        },
        /*header: {
           height: "45mm",
           contents: '<div style="text-align: center;">Print by Monmagazine.fr</div>',
        },
        footer: {
          height: "28mm",
          contents: {
            first: 'Cover page',
            // 2: 'Second page', // Any page number is working. 1-based index
            default: '<span style="color: #444;">{{page}}</span>/<span>{{pages}}</span>', // fallback value
            last: 'Last Page',
          },
        },*/

        // Rendering options
        // base: path.join('file://', __dirname, '..', '/imagestock/'), // Base path that's used to load files (images, css, js) when they aren't referenced using a host

        // Script options
        phantomPath: "/usr/local/bin/phantomjs", // PhantomJS binary which should get downloaded automatically
        timeout: 600000, // Timeout that will cancel phantomjs, in milliseconds
        // File options
        type: "pdf",             // allowed file types: png, jpeg, pdf
        quality: "75",           // only used for types png & jpeg
      };
      // create pdf
      pdf.create(html, config).toFile(path.join(__dirname, '..', `pdf/${printObj._id}.pdf`), (err, res) => {
        if (err) throw Error(`Error in generation pdf in generatePdfPhantomjs. err: ${err}`);

        console.log(`Generated PDF file succed: ${res}`);
        Print.findById(printObj._id, (err, updatePrintObj) => {
          if (err) throw Error(`Error in print.generatePdfPhantomjs.Print.findById: ${err}`);

          if (updatePrintObj) {
            if (updatePrintObj.pdfUrl === `${sslWebUrl}/pdf/${printObj._id}.pdf`) {
              callback(updatePrintObj);
            } else {
              updatePrintObj.pdfUrl = `${sslWebUrl}/pdf/${printObj._id}.pdf`;
              updatePrintObj.save(() => {
                callback(updatePrintObj);
              });
            }
          } else {
            throw Error('Empty printObj in print.generatePdfPhantomjs.Print.findById');
          }
        });
      });
    });
  },
};
