const Print = require('../models/prints.js');
const attach = require('./attach.js');
const EventData = require('../models/eventdata.js');
const event = require('./event.js');
const async = require('async');
const speakeasy = require('speakeasy');
// const pdf = require('html-pdf');
const PdfPrinter = require('pdfmake');
const fs = require('fs');
const request = require('request');
const cloudinary = require('cloudinary');
const path = require('path');
const peecho = require('./peecho.js');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_KEY,
  api_key: process.env.CLOUDINARY_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const printer = new PdfPrinter();

function download(uri, filename, callback) {
  request.head(uri, (err, res, body) => {
    console.log('content-type:', res.headers['content-type']);
    console.log('content-length:', res.headers['content-length']);

    request(uri).pipe(fs.createWriteStream(filename)).on('close', callback);
  });
}

const print = module.exports = {
  addNew: (eventId, callback) => {
    event.eventByEventId(eventId, (eventObj) => {
      attach.validateListByEventId(eventId, (attachObj) => {
        const photoArray = [];
        if (attachObj) {
          async.each(attachObj, (obj, callback1) => {
            photoArray.push({
              imageId: obj._id,
              full_url: obj.full_url,
              optimiseImageUrl: obj.optimiseImageUrl,
              author_pic: obj.author_pic,
              message: obj.message,
              public_id: obj.public_id,
              width: obj.width,
              height: obj.height,
            });
            callback1();
          }, () => {
            let isPrintable = false;
            if (attachObj.length >= 14) {
              isPrintable = true;
              const newPrint = new Print({
                pdfWidth: 210,
                pdfHeight: 297,
                photoCount: attachObj.length,
                pageCount: 2 + attachObj.length,
                photoList: photoArray,
                printable: isPrintable,
                eventId: eventObj._id,
                event_info: eventObj.event_info,
                welcome_msg: eventObj.welcome_msg,
                cover_public_id: eventObj.cover_public_id,
              });
              newPrint.save((err, printObj) => {
                if (err) throw Error(`Error in print newPrint.save: ${err}`);
                callback(printObj);
              });
            } else {
              const genId = speakeasy.generateSecret();
              const newPrint = {
                _id: genId.base32,
                pdfWidth: 210,
                pdfHeight: 297,
                photoCount: attachObj.length,
                pageCount: 2 + attachObj.length,
                photoList: photoArray,
                printable: isPrintable,
                eventId: eventObj._id,
                event_info: eventObj.event_info,
                welcome_msg: eventObj.welcome_msg,
              };
              callback(newPrint);
            }
          });
        }
      });
    });
  },
  findById: (printId, callback) => {
    Print.findOne({ _id: printId }, (err, printObj) => {
      if (err) throw Error(`Error in print.findById: ${err}`);

      callback(printObj);
    });
  },
  listBySenderId: (senderId, callbackfinal) => {
    const listEvent = {
      eventProArray: [],
      eventParArray: [],
    };
    async.parallel({
      eventPro: (callback) => {
        EventData.find({ moderators: senderId }, (err, listEventObj) => {
          if (listEventObj) {
            async.each(listEventObj,
              (eventObj, callback1) => {
                listEvent.eventProArray.push(eventObj.eventid);
                callback1();
              },
              (err) => {
                if (err) throw Error(`Error in print printListBySenderID.eventPro.EventData.find.async.each: ${err}`);

                callback(null, listEvent.eventProArray);
              }
            );
          }
        });
      },
      eventPar: (callback) => {
        EventData.find({ $and:
        [
          { join_users: senderId },
          { moderators: { $ne: senderId } },
        ] }, (err, listEventObj2) => {
          if (listEventObj2) {
            async.each(listEventObj2,
              (eventObj, callback1) => {
                listEvent.eventParArray.push(eventObj.eventid);
                callback1();
              },
              (err) => {
                if (err) throw Error(`Error in print printListBySenderID.eventPar.EventData.find.async.each: ${err}`);

                callback(null, listEvent.eventParArray);
              }
            );
          }
        });
      },
    }, (err, results) => {
      if (err) throw Error(`Error in print printListBySenderID.async.parallel.results: ${err}`);

      async.parallel({
        eventProFinal: (callback) => {
          const printList = [];
          async.each(results.eventPro, (eventId, callback) => {
            print.addNew(eventId, (printObj) => {
              printList.push(printObj);
              callback();
            });
          }, (err) => {
            if (err) throw Error(`Error in print listBySenderId.async.parallel.eventProFinal: ${err}`);

            callback(null, printList);
          });
        },
        eventParFinal: (callback) => {
          const printList = [];
          async.each(results.eventPar, (eventId, callback) => {
            print.addNew(eventId, (printObj) => {
              printList.push(printObj);
              callback();
            });
          }, (err) => {
            if (err) throw Error(`Error in print listBySenderId.async.parallel.eventProFinal: ${err}`);

            callback(null, printList);
          });
        },
      }, (err, resultFinal) => {
        if (err) throw Error(`Error in print printListBySenderID.async.parallel.eventParFinal: ${err}`);

        const finalresult = {
          eventPro: resultFinal.eventProFinal,
          eventPar: resultFinal.eventParFinal,
        };
        callbackfinal(finalresult);
      });
    });
  },
  updatePreOrder: (printObjUpdate, callback) => {
    Print.findOneAndUpdate(
      { _id: printObjUpdate.printid },
      { $set: { orientation: printObjUpdate.orientation,
        rotation_image: printObjUpdate.rotation_image,
        printTitle: printObjUpdate.printTitle,
        preorder: true },
      }
    ).exec()
    .catch((err) => { throw Error(`Error in print.updatePreOrder.findOneAndUpdate: ${err}`); })
    .then(callback());
  },
  updateOrder: (peechoReq, callback) => {
    Print.findOneAndUpdate(
      { _id: peechoReq.merchantId },
      { $set: { peechoOrderId: peechoReq.peechoId,
        ordered: true },
      },
      { new: true },
      (err, printObj) => {
        if (err) throw Error(`Error in print.updateOrder.findOneAndUpdate: ${err}`);

        callback(printObj);
      }
    );
  },
  attachDownload: (printObj, callback) => {
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
      attachLocalUri: (callback) => {
        async.forEachSeries(printObj.photoList, (photo, callback) => {
          const filePath = path.join(__dirname, '..', `imagestock/${printObj.eventId}/${photo.public_id}.jpg`);
          fs.stat(filePath, (err, stats) => {
            if (err) {
              const uri = cloudinary.image(`${photo.public_id}.jpg`);
              console.log('Filepath: ', uri);
              download(uri, filePath, () => {
                callback();
              });
            } else if (!stats.isFile()) {
              callback(new Error(`imagestock/${printObj.eventId}/${photo.public_id}.jpg is not a File !`));
            } else {
              callback();
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
            const uri = cloudinary.image(`${printObj.cover_public_id}.jpg`);
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

      callback();
    });
  },
  generatePdf: (printObj, callback) => {
    const magazine = {
      content: [],
    };

    magazine.content.push(
      printObj.printTitle,
      {
        image: path.join(__dirname, '..', `imagestock/${printObj.eventId}/${printObj.cover_public_id}.jpg`),
        pageBreak: 'after',
      }
    );

    async.forEachSeries(printObj.photoList, (photo, callback) => {
      magazine.content.push(
        {
          image: path.join(__dirname, '..', `imagestock/${printObj.eventId}/${printObj.cover_public_id}.jpg`),
          pageBreak: 'after',
        },
        photo.message
      );
      callback();
    }, (err) => {
      if (err) throw Error(`Error in print.generatedPdf.async.forEachSeries: ${err}`);

      const pdfMagazine = printer.createPdfKitDocument(magazine);
      const stream = pdfMagazine.pipe(fs.createWriteStream(path.join(__dirname, '..', `pdf/${printObj._id}.pdf`)));
      pdfMagazine.end();
      stream.on('finish', () => {
        console.log('Fin de l enrgistrement du pdf');
        Print.findOneAndUpdate(
          { _id: printObj.printid },
          { $set: { pdfUrl: `https://monmagazine.fr/messenger/pdf/${printObj._id}.pdf` } },
          (err) => {
            if (err) throw Error(`Error in print.generatePdf.forEachSeries.Print.findOneAndUpdate: ${err}`);

            callback();
          }
        );
      });
    });
  },
  sendPdfUrlToPeecho: (printObj, callback) => {
    if (!printObj.pdfUrl) throw Error(`Error in print.sendPdfUrlToPeecho: No pdfUrl found !`);

    peecho.generateSecret(printObj.peechoOrderId, printObj._id, printObj.pdfUrl,
      (genSecret) => {
        request.post(
          'http://www.peecho.com/rest/order/',
          {
            form: {
              orderId: printObj.peechoOrderId,
              sourceUrl: printObj.pdfUrl,
              merchantApiKey: printObj._id,
              secret: genSecret,
            },
          },
          (err, res, body) => {
            if (err) throw Error('Error in print.sendPdfUrlToPeecho.generateSecret.post');

            callback(res);
          }
        );
      });
  },
};
