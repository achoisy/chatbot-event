const nodemailer = require('nodemailer');
const mg = require('nodemailer-mailgun-transport');

// This is your API key that you retrieve from www.mailgun.com/cp (free up to 10K monthly emails)
const auth = {
  auth: {
    api_key: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
  },
};

const nodemailerMailgun = nodemailer.createTransport(mg(auth));

const email = module.exports = {
  sendmail: (body, callback) => {
    nodemailerMailgun.sendMail({
      from: body.email,
      to: process.env.CONTACT_EMAIL, // An array if you have multiple recipients.
      subject: body.sujet,
      // You can use "text:" to send plain-text content. It's oldschool!
      text: `Name: ${body.username}\n\nMessage: ${body.message}`,
    }, (err, info) => {
      if (err) throw Error(`email sendmail.nodemailerMailgun.sendMail: ${err}`);

      callback(info);
    });
  },
};
