// Import
const dotenv = require('dotenv');
// Config files load
dotenv.config({ silent: true });
// Import
const express = require('express');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const moment = require('moment');
const exphbs = require('express-handlebars');

moment.locale('fr'); // 'fr'

// Compose.io Mongo url
const mongodbUrl = process.env.MONGODB_CONNECT;
mongoose.Promise = global.Promise;
mongoose.connect(mongodbUrl);

// Express wrap
const app = express();

// app.use(express.static('public'));
// set the static files location for our Ember application
app.use(express.static(__dirname + '/public'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

// Routes
require('./lib/routes')(app);

//------------------------------------------------------------------------------------
// Start Server
//------------------------------------------------------------------------------------
app.listen(2368, () => {
  console.log('App listening on port 2368!');
});

// expose app
exports = module.exports = app;
