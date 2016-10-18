#!/usr/bin/env node

let cli = require('cli');
let KmerFinderServer = require('./kmerFinderServer');
let Console = require('console');
let now = require('performance-now');
let sizeof = require('object-sizeof');

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
    let kmerjs = new KmerFinderServer(
        options.fastq, options.preffix, options.length,
        options.step, options.coverage, options.output,
        'mongo', options.url,
        options.database, options.score
    );
    if (options.program === 'findKmers') {
        let kmers = kmerjs.findKmers();
        kmers.then(function () {
            process.exit();
        });
    }else if (options.program === 'findMatches') {
        let start = now();
        kmerjs.findKmers()
            .then(function (kmerMap) {
                // let keys = [...kmerMap.keys()];
                // if (options.output) {
                //     Console.log('Kmers: ', keys.length);
                // }
                kmerjs.findMatches(kmerMap)
                    .then(function () {
                        let end = now();
                        kmerjs.totalTime = end - start;
                        // let header = `file_name\ttotal_time\tkmer_extract_time\twta_time\n`;
                        // process.stdout.write(header);
                        if (options.time) {
                            let kmerMapSize = sizeof(kmerjs.kmerMap);
                            // let kmerMapSize = kmerjs.kmerSize();
                            let reducedDBSize = sizeof(kmerjs.firstMatches);
                            // let reducedDBSize = kmerjs.firstDBSize();
                            let kb =  Math.pow(2, 10);
                            let mb =  Math.pow(2, 20);
                            // let timeInfo = `${kmerjs.fastq}\t${kmerjs.totalTime/1000}\t${kmerjs.kmerExtractTime/1000}\t${kmerjs.wtaTime/1000}\t${kmerMapSize/kb} (Kb)/${kmerMapSize/mb} (Mb)\t${reducedDBSize/kb} (Kb)/${reducedDBSize/mb} (Mb)\n`;
                            let timeInfo = `${kmerjs.fastq}\t${kmerjs.totalTime/1000}\t${kmerjs.kmerExtractTime/1000}\t${kmerjs.wtaTime/1000}\t${kmerMapSize/mb}\t${reducedDBSize/mb}\n`;
                            process.stdout.write(timeInfo);
                        }
                        process.exit();
                    })
                    .catch(function (err) {
                        console.log(err);
                        process.exit();
                    });
            });
    }else{
        Console.log(options.program + ' is not a valid option! [findKmers, findMatches]');
    }

});
