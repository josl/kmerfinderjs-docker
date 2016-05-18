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
    var collection = 'complete_genomes_4';
    var dbName = 'Kmers';
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
                'mongodb://mongo:' + process.env.PORT + query.get('db'),
                query.get('collection'), 'winner'
            );
            console.log(query.size);
            query.delete('db');
            query.delete('collection');
            console.log(query.size);
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
                            coverage: match.get('coverage'),
                            ulength: match.get('ulength'),
                            species: match.get('species')
                        });
                    });
                    res.json(jsonMatches);
                })
                .catch(function (err) {
                    kmerObj.close();
                    console.log('Server: ', err.message);
                    res.status(404).send(err.message);
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
