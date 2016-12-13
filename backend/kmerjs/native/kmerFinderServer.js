/* eslint no-underscore-dangle: [2, { "allow": ["_id", "_transform", "_lastLineData", "_flush", "emit"] }] */
let Console = require('console');
let stats = require('./stats.js');
let zScore = stats.zScore;
let fastp = stats.fastp;
let etta = stats.etta;
let BN = require('bignumber.js');
BN.config({
    ROUNDING_MODE: 2
});
let mongoose = require('mongoose');
let kmers = require('./kmers.js');
let KmerJS = kmers.KmerJS;
let mapToJSON = kmers.mapToJSON;
let bluebird = require('bluebird');
let redis = require('redis');
let now = require('performance-now');
let sizeof = require('object-sizeof');


bluebird.promisifyAll(redis);
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

let Schema = mongoose.Schema;

let kmerSchema = new Schema({
    lengths: Number,
    ulengths: Number,
    description: String,
    reads: Array,
    sequence: String
});

let kmerSummarySchema = new Schema({
    templates: Number,
    uniqueLens: Number,
    totalLen: Number
});

let kmerMapSchema = new Schema({
    kmer: String,
    templates: Array
});


function findKmersMatchesRedis(kmerMap, client, start) {
    // let kmerQuery = Object.keys(kmerMap);
    let kmerQuery = [];
    let promises = [];
    let templates = Object.create(null);;
    let nHits = 0;
    // start a separate batch command queue
    for (var kmer in kmerMap) {
        promises.push(['lrange', kmer, 0, -1]);
        kmerQuery.push(kmer);
    }
    console.log(kmerQuery.length);
    // console.log(promises);
    // kmerQuery.forEach(function (kmer) {
    //     promises.push(['lrange', kmer, 0, -1]);
    // });
    function updateMatches(matchTemplates, index) {
        let kmerString = kmerQuery[index];
        nHits += matchTemplates.length;
        let kmerCoverage = kmerMap[kmerString];
        matchTemplates.forEach(function (template) {
            template = JSON.parse(template);
            let sequence = templates[template.sequence];
            if (sequence !== undefined) {
                sequence.tScore += kmerCoverage;
                sequence.uScore += 1;
                if (! (kmerString in sequence.kmers)){
                    sequence.kmers[kmerString] = 1;
                }
            } else {
                // let kmerInitMap = {kmerString : 1};
                templates[template.sequence] = {
                    tScore: kmerCoverage,
                    uScore: 1,
                    lengths: template.lengths,
                    ulength: template.ulenght || template.ulength || template.ulengths,
                    // ulength: template.ulengths,
                    species: template.species,
                    kmers: {}
                };
                // console.log(kmerString);
                templates[template.sequence].kmers[kmerString] = 1;
            }
        });
    }
    return client.batch(promises)
        .execAsync()
        .then(function (results) {
            results.forEach(function (matchTemplates, index) {
                updateMatches(matchTemplates, index);
            });
            if (nHits === 0) {
                throw new Error('No hits were found!');
            }
            let end = now();
            console.log(nHits);
            return {
                templates: templates,
                hits: nHits,
                time: end - start
            };
        });
}


function findMatchesMongoAggregation(kmerMap, conn, collection) {
    kmerSchema.index({
        reads: 1
    });
    kmerSchema.index({
        sequence: 1
    });
    let kmerDB = conn.model(collection, kmerMapSchema, collection);
    let kmerQuery = [...kmerMap.keys()];

    return kmerDB
        .aggregate([{
            $match: {
                reads: {
                    $in: kmerQuery
                }
            }
        }])
        .project({
            _id: 0,
            sequence: 1,
            lengths: 1,
            ulength: "$ulenght",
            species: 1,
            filteredKmers: {
                $filter: {
                    input: "$reads",
                    as: "kmer",
                    cond: {
                        $setIsSubset: [{
                                $map: {
                                    input: {
                                        "$literal": ["single_element"]
                                    },
                                    as: "el",
                                    in: "$$kmer"
                                }
                            },
                            kmerQuery
                        ]
                    }
                }
            }
        })
        .exec()
        .then(function (hits) {
            let templates = new Map();
            let nHits = 0;
            for (let hit of hits) {
                nHits += hit.filteredKmers.length;
                hit.filteredKmers.forEach(function (read) {
                    let template = templates.get(hit.sequence);
                    let kmerCoverage = kmerMap.get(read);
                    if (template !== undefined) {
                        template.tScore += kmerCoverage;
                        template.uScore += 1;
                    } else {
                        templates.set(hit.sequence, {
                            tScore: kmerCoverage,
                            uScore: 1,
                            lengths: hit.lengths,
                            ulength: hit.ulength,
                            species: hit.species,
                            kmers: new Set(hit.filteredKmers)
                        });
                    }
                });
            }
            if (nHits === 0) {
                throw new Error('No hits were found!');
            }
            return {
                templates: templates,
                hits: nHits
            };
        });
}


/**
 * [matchSummary description]
 * @param  {[type]} kmerObject [description]
 * @param  {[type]} sequence   [description]
 * @param  {[type]} match      [description]
 * @param  {[type]} results    [description]
 * @param  {[type]} summary    [description]
 * @return {[type]}            [description]
 */
function matchSummary(kmerObject, sequence, match, results, summary) {
    let minScore = 0;
    let kmerQuerySize = kmerObject.kmerMapSize;
    let sequenceHit = kmerObject.firstMatches[sequence];
    // let sequenceHit = kmerObject.firstMatches.get(sequence);
    let originalUScore = sequenceHit.uScore;
    let originalTScore = sequenceHit.tScore;
    let matchUScore = match.uScore;
    if (match.uScore > minScore) {
        let z = zScore(match.uScore, match.ulength, results.hits, summary.uniqueLens);
        let probability = fastp(z)
            .times(summary.templates);
        let allow = kmerObject.evalue.cmp(probability); // p <= evalue
        if (allow >= 0) {
            let fracQ = new BN(100)
                .times(2)
                .times(matchUScore)
                .dividedBy(
                    new BN(kmerQuerySize)
                    .plus(etta)
                );
            let fracD = new BN(100)
                .times(matchUScore)
                .dividedBy(
                    new BN(match.ulength)
                    .plus(etta)
                );
            let totFracQ = new BN(100)
                .times(2)
                .times(originalUScore)
                .dividedBy(
                    new BN(kmerQuerySize)
                    .plus(etta)
                );
            let totFracD = new BN(100)
                .times(originalUScore)
                .dividedBy(
                    new BN(match.ulength)
                    .plus(etta)
                );
            let totFracCov = new BN(originalTScore)
                .dividedBy(match.lengths)
                .round(2, 6)
                .toNumber();
            let expected = new BN(results.hits)
                .times(match.ulength)
                .dividedBy(summary.uniqueLens);
            return new Map([
                ['template', sequence],
                ['score', matchUScore],
                ['expected', expected.round(0, 6)
                    .toNumber()
                ],
                ['z', z.round(2)
                    .toNumber()
                ],
                ['probability', probability.toNumber()],
                ['frac-q', fracQ.round(2, 6)
                    .toNumber()
                ],
                ['frac-d', fracD.round(2, 6)
                    .toNumber()
                ],
                ['depth', new BN(match.tScore)
                    .dividedBy(match.lengths)
                    .round(2, 6)
                    .toNumber()
                ],
                ['kmers-template', match.ulength],
                ['total-frac-q', totFracQ.round(2, 6)
                    .toNumber()
                ],
                ['total-frac-d', totFracD.round(2, 6)
                    .toNumber()
                ],
                ['total-temp-cover', totFracCov],
                ['species', match.species]
            ]);
        }
    }
}

/**
 * [sortKmerResults description]
 * @param  {[type]} a [Match Summary entry]
 * @param  {[type]} b [description]
 * @return {[type]}   [description]
 */
function sortKmerResults(a, b) {
    if (a.get('score') > b.get('score')) {
        return -1;
    }
    if (a.get('score') < b.get('score')) {
        return 1;
    }
    // a must be equal to b
    return 0;
}

/**
 * [sortKmerMatches Sort Matches by Hits (= Score)]
 * @param  {[type]} a [Match]
 * @param  {[type]} b [Match]
 * @return {[type]}   [description]
 */
function sortKmerMatches(a, b) {
    if (a[1].uScore > b[1].uScore) {
        return -1;
    }
    if (a[1].uScore < b[1].uScore) {
        return 1;
    }
    // a must be equal to b
    return 0;
}

function firstMatch(kmerObject, kmerMap) {
    let start = now();
    kmerObject.redis.select(4);
    // kmerObject.redis.select(1);
    return kmerObject.redis
        .hgetallAsync('Summary')
        .then(function (summary) {
            kmerObject.redis.select(3);
            // kmerObject.redis.select(0);
            kmerObject.summary = {
                templates: +summary.Ntemplates,
                totalLen: +summary.template_tot_len,
                uniqueLens: +summary.template_tot_ulen
            };
            return findKmersMatchesRedis(kmerMap, kmerObject.redis, start);
        });
}

/**
 * [winnerScoring]
 * @param  {[Map]}    kmerMap    [Dictionary of presence of Kmers]
 * @param  {[Object]} kmerObject [Instance of KmerServer]
 * @return {[type]}              [description]
 */
function winnerScoring(kmerObject, kmerMap) {
    let hitCounter = 0;
    let notFound = true;
    let kmerResults = [];
    let start = now();


    function findWinner(results) {
        let templates =Object.keys(results.templates)
              .map(function (key) {
                  return [key, results.templates[key]];
              })
              .sort(sortKmerMatches);
        if (hitCounter === 0) {
            kmerObject.firstMatches = results.templates;
            if (kmerObject.progress) {
                let out = 'Template\tScore\tExpected\tz\tp_value\tquery\tcoverage [%]\ttemplate coverage [%]\tdepth\tKmers in Template\tDescription\n';
                process.stdout.write(out);
            }
        }
        let sequence = templates[0][0];
        let match = templates[0][1];
        let winner = matchSummary(kmerObject, sequence, match, results, kmerObject.summary);

        // Winner is undefined if match's score < minScore
        if (winner && kmerObject.evalue.cmp(winner.get('probability')) >= 0) {
            hitCounter += 1;
            kmerResults.push(winner);
            if (kmerObject.progress) {
                let seq = winner.get('template');
                let score = winner.get('score');
                let expec = winner.get('expected');
                let z = winner.get('z');
                let p = winner.get('probability');
                let fracQ = winner.get('frac-q');
                let fracD = winner.get('frac-d');
                let cov = winner.get('depth');
                let ulen = winner.get('kmers-template');
                let spec = winner.get('species');
                let out = `${seq}\t${score}\t${expec}\t${z}\t${p}\t${fracQ}\t${fracD}\t${cov}\t${ulen}\t${spec}\n`;
                process.stdout.write(out);
            }
            return match.kmers;
        } else {
            return;
        }
    }

    function removeWinnerKmers(matchKmers) {
        if (matchKmers) {
            // remove all kmers in best hit from kmerMap
            for (let kmer in matchKmers) {
                delete kmerMap[kmer];
            }
            // });
            return;
        } else {
            notFound = false;
            return;
        }
    }

    function getMatches(kmerObject, kmerQueryMap) {
        let templates = Object.create(null);
        let nHits = 0;

        for (let sequence in kmerObject.firstMatches) {
            let hit = kmerObject.firstMatches[sequence];
            let template = templates[sequence];
            let kmerCoverage = 0;
            for (let kmer in hit.kmers) {
                if (kmerCoverage = kmerQueryMap[kmer]) {
                    if (template !== undefined) {
                        template.tScore += kmerCoverage;
                        template.uScore += 1;
                        if (! (kmer in template.kmers)){
                            template.kmers[kmer] = 1;
                            template.nKmers += 1;
                        }
                    } else {
                        // console.log('first time!');
                        templates[sequence] = {
                            tScore: kmerCoverage,
                            uScore: 1,
                            lengths: hit.lengths,
                            ulength: hit.ulength,
                            species: hit.species,
                            kmers: {kmer : 1},
                            nKmers: 1
                        };
                        template = templates[sequence];
                    }
                }
            }
            // console.log(template);
            if (template !== undefined) {
                nHits += template.nKmers;
            } else {
                delete kmerObject.firstMatches[sequence];
            }
        }
        if (nHits === 0) {
            throw new Error('No hits were found! (nHits === 0)');
        }
        return {
            templates: templates,
            hits: nHits
        };
    }

    var loop = function () {
        while (notFound && hitCounter < kmerObject.maxHits) {
            let results = getMatches(kmerObject, kmerMap);
            let winnerKmers = findWinner(results);
            removeWinnerKmers(winnerKmers);
        }
        let end = now();
        kmerObject.wtaTime = end - start;
        if (kmerResults.length === 0) {
            throw new Error('No hits were found! (kmerResults.length === 0)');
        }
        return kmerResults;
    };

    return firstMatch(kmerObject, kmerMap)
        .then(findWinner)
        .then(removeWinnerKmers)
        .then(loop);
}

/**
 * [standardScoring description]
 * @param  {[Object]} kmerObject [Instance of KmerServer]
 * @param  {[Map]}    kmerMap    [Dictionary of presence of Kmers]
 * @return {[type]}              [description]
 */
function standardScoring(kmerObject, kmerMap) {
    let kmerResults = [];
    return Promise.all([
            mongoose
            .model('Summary', kmerSummarySchema, 'Summary')
            .findOne({
                templates: {
                    $gt: 1
                }
            }, {
                _id: 0
            })
            .exec(),
            findMatchesMongoAggregation(kmerMap, kmerObject.db.url, kmerObject.collection, kmerObject.progress),
        ])
        .then(([summary, results]) => {
            kmerObject.firstMatches = results.templates;
            for (let [sequence, match] of results.templates) {
                kmerResults.push(
                    matchSummary(kmerObject, sequence, match, results, summary)
                );
            }
            return kmerResults.sort(sortKmerResults);
        });
}

class KmerFinderServer extends KmerJS {
    /**
     * [constructor description]
     * @param  {[type]} fastq                                 [description]
     * @param  {[type]} preffix                               =             'ATGAC'   [description]
     * @param  {[type]} length                                =             16        [description]
     * @param  {[type]} step                                  =             1         [description]
     * @param  {[type]} coverage                              =             1         [description]
     * @param  {[type]} out                                   =             ''        [description]
     * @param  {[type]} db                                    =             'mongo'   [description]
     * @param  {[type]} method                                =             'standar' [description]
     * @param  {[type]} url='mongodb://localhost:27017/Kmers' [description]
     * @param  {[type]} collection='genomes'                  [description]
     * @return {[type]}                                       [description]
     */
    constructor(fastq, preffix = 'ATGAC', length = 16, step = 1, coverage = 1,
            progress = true, db = 'mongo',
            url = 'mongodb:\/\/localhost:27017/Kmers', collection = 'genomes',
            method = 'standard', maxHits = 100) {
            super(fastq, preffix, length, step, coverage, progress, 'node');
            // this.redis = redis.createClient({
            //     host: '127.0.0.1',
            //     port: 6379,
            //     url: 'redis://127.0.0.1:6379'
            // });
            this.redis = redis.createClient({
                host: url.substring(8, 22),
                port: +url.substring(23, 28),
                url: url
            });
            this.redis.on('error', function (err) {
                throw new Error(err);
            });
            this.method = method;
            this.collection = collection;
            this.firstMatches = new Map();
            this.maxHits = maxHits;
            this.totalTime = 0.0;
            this.dbQueryTime = 0.0;
            this.wtaTime = 0.0;
            this.fileSize = 0;
            this.kmerMapSize = 0;
            this.reducedDBSize = 0;
        }
    /**
     * [findKmers Wrapper around reading file function]
     * @return {[Map]} [Kmer Map]
     */
    findKmers() {
            return this.readFile().promise;
        }
    /**
     * [findAllMatches description]
     * @param  {[Map]}     kmerMap [Kmer Map]
     * @return {[Promise]}         [description]
     */
    findMatches(kmerMap) {
        if (this.method === 'standard') {
            return standardScoring(this, kmerMap);
        } else if (this.method === 'winner') {
            return winnerScoring(this, kmerMap);
        } else {
            throw new Error('Scoring scheme unknown');
        }
    }
    findFirstMatch(kmerMap) {
        if (this.method === 'standard') {
            return standardScoring(this, kmerMap);
        } else if (this.method === 'winner') {
            return firstMatch(this, kmerMap);
        } else {
            throw new Error('Scoring scheme unknown');
        }
    }
    findMatchesTest(kmerMap) {
        return winnerScoring(this, kmerMap);
    }
    kmerSize() {
        return sizeof(mapToJSON(this.kmerMap));
    }
    firstDBSize() {
        return sizeof(mapToJSON(this.firstMatches));
    }
    close() {
        this.conn.close();
    }
}

module.exports = KmerFinderServer;
