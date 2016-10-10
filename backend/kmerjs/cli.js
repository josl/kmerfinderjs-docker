#!/usr/bin/env node
'use strict';

var _kmerFinderServer = require('./kmerFinderServer');

var _console = require('console');

var _console2 = _interopRequireDefault(_console);

var _performanceNow = require('performance-now');

var _performanceNow2 = _interopRequireDefault(_performanceNow);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } }

var cli = require('cli');


cli.parse({
    fastq: ['f', 'FASTQ file to parse', 'file', 'test_data/test_long.fastq'],
    preffix: ['p', 'Kmer preffix', 'string', 'ATGAC'],
    length: ['l', 'Kmer lenght', 'number', 16],
    step: ['s', 'Kmer step', 'number', 1],
    coverage: ['c', 'Min coverage', 'number', 1],
    output: ['o', 'Print info', 'number', 1],
    time: ['t', 'Print time performance', 'number', 0],
    program: ['P', 'Program to execute: [findKmers, findMatches]', 'string', 'findMatches'],
    score: ['S', 'Score to execute: [standard, winner]', 'string', 'winner'],
    database: ['d', 'Database to query: [Bacteria, Virus...]', 'string', 'KmerMap'],
    url: ['u', 'Url of the database', 'string', 'mongodb://localhost:27017/Kmers']
});

cli.main(function (args, options) {
    var kmerjs = new _kmerFinderServer.KmerFinderServer(options.fastq, options.preffix, options.length, options.step, options.coverage, options.output, 'mongo', options.url, options.database, options.score);
    if (options.program === 'findKmers') {
        var kmers = kmerjs.findKmers();
        kmers.then(function () {
            process.exit();
        });
    } else if (options.program === 'findMatches') {
        (function () {
            var start = (0, _performanceNow2.default)();
            kmerjs.findKmers().then(function (kmerMap) {
                var keys = [].concat(_toConsumableArray(kmerMap.keys()));
                if (options.output) {
                    _console2.default.log('Kmers: ', keys.length);
                }
                kmerjs.findMatches(kmerMap).then(function () {
                    var end = (0, _performanceNow2.default)();
                    kmerjs.totalTime = end - start;
                    // let header = `file_name\ttotal_time\tkmer_extract_time\twta_time\n`;
                    // process.stdout.write(header);
                    if (options.time) {
                        var kmerMapSize = kmerjs.kmerSize();
                        var reducedDBSize = kmerjs.firstDBSize();
                        var kb = Math.pow(2, 10);
                        var mb = Math.pow(2, 20);
                        // let timeInfo = `${kmerjs.fastq}\t${kmerjs.totalTime/1000}\t${kmerjs.kmerExtractTime/1000}\t${kmerjs.wtaTime/1000}\t${kmerMapSize/kb} (Kb)/${kmerMapSize/mb} (Mb)\t${reducedDBSize/kb} (Kb)/${reducedDBSize/mb} (Mb)\n`;
                        var timeInfo = kmerjs.fastq + '\t' + kmerjs.totalTime / 1000 + '\t' + kmerjs.kmerExtractTime / 1000 + '\t' + kmerjs.wtaTime / 1000 + '\t' + kmerMapSize / mb + '\t' + reducedDBSize / mb + '\n';
                        process.stdout.write(timeInfo);
                    }
                    process.exit();
                }).catch(function (err) {
                    console.log(err);
                    process.exit();
                });
            });
        })();
    } else {
        _console2.default.log(options.program + ' is not a valid option! [findKmers, findMatches]');
    }
});