'use strict';
require('dotenv').config();
const express     = require('express');
const bodyParser  = require('body-parser');
const cors        = require('cors');
const helmet      = require('helmet');

const apiRoutes         = require('./routes/api.js');
const fccTestingRoutes  = require('./routes/fcctesting.js');
const runner            = require('./test-runner');

require("./db-connection");

const app = express();

// Security middleware
app.use(helmet());

// Set Content Security Policy
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"], // Only allow content from the same origin by default
    scriptSrc: [
      "'self'", // Allow scripts from the same origin
      'https://stock-price-checker-proxy.freecodecamp.rocks', // Allow scripts from the proxy API
      'https://cdnjs.cloudflare.com', // Allow CDN resources (e.g., for testing or third-party libraries)
      'https://*.googleapis.com' // Allow Google APIs (common for testing scripts or other resources)
    ],
    styleSrc: [
      "'self'", // Allow styles from the same origin
      'https://cdnjs.cloudflare.com', // Allow styles from CDN for third-party libraries
      'https://fonts.googleapis.com' // Allow Google Fonts
    ],
    connectSrc: [
      "'self'", // Allow API calls to the same origin
      'https://stock-price-checker-proxy.freecodecamp.rocks', // Allow API calls to the stock price proxy API
      'https://*.googleapis.com' // Allow connections to Google APIs (if needed)
    ],
    imgSrc: ["'self'", 'data:', 'https://www.google-analytics.com'], // Allow images from same origin or Google Analytics
    fontSrc: ["'self'", 'https://fonts.gstatic.com'], // Allow Google Fonts
    objectSrc: ["'none'"], // Disallow plugins
    upgradeInsecureRequests: true // Set to `true` to automatically upgrade HTTP to HTTPS
  }
}));


app.use('/public', express.static(process.cwd() + '/public'));

app.use(cors({origin: '*'})); //For FCC testing purposes only

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Index page (static HTML)
app.route('/')
  .get(function (req, res) {
    res.sendFile(process.cwd() + '/views/index.html');
  });

// For FCC testing purposes
fccTestingRoutes(app);

// Routing for API 
apiRoutes(app);  

// 404 Not Found Middleware
app.use(function(req, res, next) {
  res.status(404)
    .type('text')
    .send('Not Found');
});

// Start our server and tests!
const listener = app.listen(process.env.PORT || 3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
  if(process.env.NODE_ENV==='test') {
    console.log('Running Tests...');
    setTimeout(function () {
      try {
        runner.run();
      } catch(e) {
        console.log('Tests are not valid:');
        console.error(e);
      }
    }, 3500);
  }
});

module.exports = app; // for testing
