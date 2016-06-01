var express = require('express');
var kmerFinder = require('./kmerjs/kmerFinderServer.js');
var kmerJS = require('./kmerjs/kmers.js');
var Console = require('console');
var bodyParser = require('body-parser');
var app = express();

app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    next();
});

// parse application/x-www-form-urlencoded
// app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
// app.use(bodyParser.json());

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
            var query = kmerJS.stringToMap(kmers);
            console.log(query.get('db'), query.get('collection'));
            var kmerObj = new kmerFinder.KmerFinderServer(
                '',
                'ATGAC', 16, 1, 1, true, 'mongo',
                'mongodb://mongo:' + process.env.PORT + '/' +query.get('db'),
                query.get('collection'), 'winner'
            );
            query.delete('db');
            query.delete('collection');
            kmerObj.findMatches(query)
                .then(function (matches) {
                    kmerObj.close();
                    console.log('Matches found: ', matches.length);
                    matches.forEach(function (match) {
                        jsonMatches.push({
                            template: match.get('template'),
                            score: match.get('score'),
                            expected: match.get('expected'),
                            z: match.get('z'),
                            probability: match.get('probability'),
                            'frac-q': match.get('frac-q'),
                            'frac-d': match.get('frac-d'),
                            depth: match.get('depth'),
                            'total-frac-q': match.get('total-frac-q'),
                            'total-frac-d': match.get('total-frac-d'),
                            'total-temp-cover': match.get('total-temp-cover'),
                            'kmers-template': match.get('kmers-template'),
                            species: match.get('species')
                        });
                    });
                    res.json(jsonMatches);
                })
                .catch(function (err) {
                    kmerObj.close();
                    console.log('Server: ', err.message);
                    res.status(204).send({ error: err.message});
                });
        });
});

var server = app.listen(80, function () {
    var host = server.address()
        .address;
    var port = server.address()
        .port;

    Console.log('Example app listening at http://%s:%s', host, port);
});
