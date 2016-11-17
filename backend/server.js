#!/usr/bin/env node

var express = require('express');
var kmerFinder = require('./kmerjs/native/kmerFinderServer.js');
var kmerJS = require('./kmerjs/native/kmers.js');
var Console = require('console');
var bodyParser = require('body-parser');
var app = express();

var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);
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

server.listen(80, function () {
    console.log('Ready');
});

// create application/json parser
var textParser = bodyParser.raw();


app.get('/', function (req, res) {
    res.send('Hello World!');
});

function waitForMatches(matches, kmerObj, socket){
    matches.event
        .on('winner', function (winner) {
            console.log('New inner');
            socket.emit('newMatch', kmerJS.mapToJSON(winner));
        });

    matches.promise
        .then(function () {
            kmerObj.close();
            socket.emit('lastMatch');
        })
        .catch(function (err) {
            kmerObj.close();
            console.log('Server: ', err.message);
            socket.emit('error', { error: err.message});
        });
}

io.on('connection', function (socket) {
    socket.on('kmerQuery', function (kmerQuery) {
        var query = kmerJS.jsonToStrMap(kmerQuery);
        console.log(query.get('db'), query.get('collection'));
        var kmerObj = new kmerFinder.KmerFinderServer(
            '',
            'ATGAC', 16, 1, 1, true, 'mongo',
            'mongodb://mongo:' + process.env.PORT + '/' +query.get('db'),
            query.get('collection'), 'winner'
        );
        query.delete('db');
        query.delete('collection');
        var matches = kmerObj.findMatches(query);
        console.log('sending confirmation!');
        socket.emit('queryReceived');
        waitForMatches(matches, kmerObj, socket);
    });
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
            var kmerMap = kmers;
            console.log(kmerMap.db, kmerMap.collection);
            var kmerObj = new kmerFinder.KmerFinderServer(
                '',
                'ATGAC', 16, 1, 1, false, 'mongo',
                'redis://redis:' + process.env.PORT,
                // 'mongodb://mongo:' + process.env.PORT + '/' + kmerMap.get('db'),
                kmerMap.collection, 'winner'
            );
            // var kmerMap = kmerJS.stringToMap(kmers);
            // console.log(kmerMap.get('db'), kmerMap.get('collection'));
            // var kmerObj = new kmerFinder.KmerFinderServer(
            //     '',
            //     'ATGAC', 16, 1, 1, false, 'mongo',
            //     'redis://redis:' + process.env.PORT,
            //     // 'mongodb://mongo:' + process.env.PORT + '/' + kmerMap.get('db'),
            //     kmerMap.get('collection'), 'winner'
            // );
            delete kmerMap.db;
            delete kmerMap.collection;
            // kmerMap.delete('db');
            // kmerMap.delete('collection');
            // console.log('kmer Size received ', kmerMap.size);
            kmerObj.kmerMapSize = Object.keys(test).length
            // kmerObj.kmerMapSize = kmerMap.size;
            kmerObj.findFirstMatch(kmerMap)
                .then(function (matches) {
                    console.log(matches.hits);

                    matches.templates =Object.keys(matches.tempplates)
                                  .map(function (key) {
                                      return [key, matches[key]];
                                  });
                  matches.templates.forEach(function (hit, sequence) {
                      hit.kmers = Array.from(hit.kmers);
                      // hit.kmers = new Array(hit.kmers.values());
                  });
                    // matches.templates.forEach(function (hit, sequence) {
                    //     hit.kmers = Array.from(hit.kmers);
                    //     // hit.kmers = new Array(hit.kmers.values());
                    // });
                    matches.summary = kmerObj.summary;
                    // matches.templates = kmerJS.mapToJSON(matches.templates);
                    // kmerObj.close();
                    // matches.forEach(function (match) {
                    //     jsonMatches.push(kmerJS.mapToJSON(match));
                    // });
                    res.json(matches);
                })
                .catch(function (err) {
                    // kmerObj.close();
                    console.log('Server: ', err.message);
                    res.status(204).send({ error: err.message});
                });
        });
});
