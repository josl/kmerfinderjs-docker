#!/usr/bin/env node

var express = require('express');
var kmerFinder = require('./kmerjs/native/kmerFinderServer.js');
var kmerJS = require('./kmerjs/native/kmers.js');
var Console = require('console');
var bodyParser = require('body-parser');
var app = express();

var app = require('express')();
var server = require('http').Server(app);
const https = require('https');
// var io = require('socket.io')(server);
var helmet = require('helmet');

app.use(helmet());

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

const options = {
  key: fs.readFileSync('/usr/src/certs/private.key'),
  cert: fs.readFileSync('/usr/src/certs/cert.crt')
};

https.createServer(options, app).listen(443);

server.listen(80, function () {
    console.log('Ready');
});

// create application/json parser
var textParser = bodyParser.raw();


app.get('/', function (req, res) {
    res.send('Hello World!');
});

app.post('/kmers', textParser, function (req, res) {
    if (!req.body) {
        return res.sendStatus(400);
    }
    console.log('new request!', req.body);
    req.setEncoding('utf8');
    var kmers = '';
    req.on('data', function (chunk) {
            kmers += chunk.toString();
        })
        .on('end', function () {
            var jsonMatches = [];
            var kmerObj = new kmerFinder(
                '',
                'ATGAC', 16, 1, 1, false, 'mongo',
                'redis://redis:' + process.env.PORT,
              kmers['collection'], 'winner'
            );
            var kmerMap = JSON.parse(kmers);
            kmerObj.kmerMapSize = Object.keys(kmerMap).length;
            kmerObj.findFirstMatch(kmerMap)
                .then(function (matches) {
                    console.log('we found hits!', matches.hits);
                    console.log('sending stuff to the client!');
                    res.json(matches);
                })
                .catch(function (err) {
                    // kmerObj.close();
                    console.log('Server: ', err.message);
                    res.status(204).send({ error: err.message});
                });
        });
});
