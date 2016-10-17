'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.KmerFinderServer = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _console = require('console');

var _console2 = _interopRequireDefault(_console);

var _stats = require('./stats');

var _bignumber = require('bignumber.js');

var _bignumber2 = _interopRequireDefault(_bignumber);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _kmers = require('./kmers.js');

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _redis = require('redis');

var _redis2 = _interopRequireDefault(_redis);

var _performanceNow = require('performance-now');

var _performanceNow2 = _interopRequireDefault(_performanceNow);

var _objectSizeof = require('object-sizeof');

var _objectSizeof2 = _interopRequireDefault(_objectSizeof);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* eslint no-underscore-dangle: [2, { "allow": ["_id", "_transform", "_lastLineData", "_flush", "emit"] }] */


_bignumber2.default.config({
    ROUNDING_MODE: 2
});


_bluebird2.default.promisifyAll(_redis2.default);
_bluebird2.default.promisifyAll(_redis2.default.RedisClient.prototype);
_bluebird2.default.promisifyAll(_redis2.default.Multi.prototype);

var Schema = _mongoose2.default.Schema;

var kmerSchema = new Schema({
    lengths: Number,
    ulengths: Number,
    description: String,
    reads: Array,
    sequence: String
});

var kmerSummarySchema = new Schema({
    templates: Number,
    uniqueLens: Number,
    totalLen: Number
});

var kmerMapSchema = new Schema({
    kmer: String,
    templates: Array
});

function findKmersMatchesRedis(kmerMap, client, start) {
    var kmerQuery = Object.keys(kmerMap);
    // let kmerQuery = [...kmerMap.keys()];
    // let templates = new Map();
    var templates = Object.create(null);;
    var nHits = 0;

    function updateMatches(matchTemplates, index) {
        var kmer = kmerQuery[index];
        nHits += matchTemplates.length;
        var kmerCoverage = kmerMap[kmer];
        // let kmerCoverage = kmerMap.get(kmer);
        matchTemplates.forEach(function (template) {
            template = JSON.parse(template);
            var sequence = templates[template.sequence];
            if (sequence !== undefined) {
                sequence.tScore += kmerCoverage;
                sequence.uScore += 1;
                if (!(kmer in sequence.kmers)) {
                    sequence.kmers[kmer] = 1;
                }
                // sequence.kmers.add(kmer);
            } else {
                    templates[template.sequence] = {
                        tScore: kmerCoverage,
                        uScore: 1,
                        lengths: template.lengths,
                        ulength: template.ulengths,
                        species: template.species,
                        kmers: { kmer: 1 }
                        // kmers: new Set([kmer])
                    };
                }
            // let sequence = templates.get(template.sequence);
            // if (sequence !== undefined) {
            //     sequence.tScore += kmerCoverage;
            //     sequence.uScore += 1;
            //     sequence.kmers.add(kmer);
            // } else {
            //     templates.set(template.sequence, {
            //         tScore: kmerCoverage,
            //         uScore: 1,
            //         lengths: template.lengths,
            //         ulength: template.ulengths,
            //         species: template.species,
            //         kmers: new Set([kmer])
            //     });
            // }
        });
    }

    var promises = [];
    // start a separate batch command queue
    kmerQuery.forEach(function (kmer) {
        promises.push(['lrange', kmer, 0, -1]);
    });
    return client.batch(promises).execAsync().then(function (results) {
        results.forEach(function (matchTemplates, index) {
            updateMatches(matchTemplates, index);
        });
        if (nHits === 0) {
            throw new Error('No hits were found!');
        }
        var end = (0, _performanceNow2.default)();
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
    var kmerDB = conn.model(collection, kmerMapSchema, collection);
    var kmerQuery = [].concat(_toConsumableArray(kmerMap.keys()));

    return kmerDB.aggregate([{
        $match: {
            reads: {
                $in: kmerQuery
            }
        }
    }]).project({
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
                    }, kmerQuery]
                }
            }
        }
    }).exec().then(function (hits) {
        var templates = new Map();
        var nHits = 0;
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
            var _loop = function _loop() {
                var hit = _step.value;

                nHits += hit.filteredKmers.length;
                hit.filteredKmers.forEach(function (read) {
                    var template = templates.get(hit.sequence);
                    var kmerCoverage = kmerMap.get(read);
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
            };

            for (var _iterator = hits[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                _loop();
            }
        } catch (err) {
            _didIteratorError = true;
            _iteratorError = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion && _iterator.return) {
                    _iterator.return();
                }
            } finally {
                if (_didIteratorError) {
                    throw _iteratorError;
                }
            }
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
    var minScore = 0;
    var kmerQuerySize = kmerObject.kmerMapSize;
    var sequenceHit = kmerObject.firstMatches[sequence];
    // let sequenceHit = kmerObject.firstMatches.get(sequence);
    var originalUScore = sequenceHit.uScore;
    var originalTScore = sequenceHit.tScore;
    var matchUScore = match.uScore;
    if (match.uScore > minScore) {
        var z = (0, _stats.zScore)(match.uScore, match.ulength, results.hits, summary.uniqueLens);
        var probability = (0, _stats.fastp)(z).times(summary.templates);
        var allow = kmerObject.evalue.cmp(probability); // p <= evalue
        if (allow >= 0) {
            var fracQ = new _bignumber2.default(100).times(2).times(matchUScore).dividedBy(new _bignumber2.default(kmerQuerySize).plus(_stats.etta));
            var fracD = new _bignumber2.default(100).times(matchUScore).dividedBy(new _bignumber2.default(match.ulength).plus(_stats.etta));
            var totFracQ = new _bignumber2.default(100).times(2).times(originalUScore).dividedBy(new _bignumber2.default(kmerQuerySize).plus(_stats.etta));
            var totFracD = new _bignumber2.default(100).times(originalUScore).dividedBy(new _bignumber2.default(match.ulength).plus(_stats.etta));
            var totFracCov = new _bignumber2.default(originalTScore).dividedBy(match.lengths).round(2, 6).toNumber();
            var expected = new _bignumber2.default(results.hits).times(match.ulength).dividedBy(summary.uniqueLens);
            return new Map([['template', sequence], ['score', matchUScore], ['expected', expected.round(0, 6).toNumber()], ['z', z.round(2).toNumber()], ['probability', probability.toNumber()], ['frac-q', fracQ.round(2, 6).toNumber()], ['frac-d', fracD.round(2, 6).toNumber()], ['depth', new _bignumber2.default(match.tScore).dividedBy(match.lengths).round(2, 6).toNumber()], ['kmers-template', match.ulength], ['total-frac-q', totFracQ.round(2, 6).toNumber()], ['total-frac-d', totFracD.round(2, 6).toNumber()], ['total-temp-cover', totFracCov], ['species', match.species]]);
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
    var start = (0, _performanceNow2.default)();
    kmerObject.redis.select(1);
    return kmerObject.redis.hgetallAsync('Summary').then(function (summary) {
        kmerObject.redis.select(0);
        kmerObject.summary = {
            templates: +summary.templates,
            totalLen: +summary.totalLen,
            uniqueLens: +summary.uniqueLens
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
    var hitCounter = 0;
    var notFound = true;
    var kmerResults = [];
    var start = (0, _performanceNow2.default)();

    function findWinner(results) {
        var templates = Object.keys(results.templates).map(function (key) {
            return [key, results.templates[key]];
        }).sort(sortKmerMatches);
        // let templates = [...results.templates].sort(sortKmerMatches);
        if (hitCounter === 0) {
            kmerObject.firstMatches = results.templates;
            if (kmerObject.progress) {
                var out = 'Template\tScore\tExpected\tz\tp_value\tquery\tcoverage [%]\ttemplate coverage [%]\tdepth\tKmers in Template\tDescription\n';
                process.stdout.write(out);
            }
        }
        var sequence = templates[0][0];
        var match = templates[0][1];
        var winner = matchSummary(kmerObject, sequence, match, results, kmerObject.summary);

        // Winner is undefined if match's score < minScore
        if (winner && kmerObject.evalue.cmp(winner.get('probability')) >= 0) {
            hitCounter += 1;
            kmerResults.push(winner);
            if (kmerObject.progress) {
                var seq = winner.get('template');
                var score = winner.get('score');
                var expec = winner.get('expected');
                var z = winner.get('z');
                var p = winner.get('probability');
                var fracQ = winner.get('frac-q');
                var fracD = winner.get('frac-d');
                var cov = winner.get('depth');
                var ulen = winner.get('kmers-template');
                var spec = winner.get('species');
                var _out = seq + '\t' + score + '\t' + expec + '\t' + z + '\t' + p + '\t' + fracQ + '\t' + fracD + '\t' + cov + '\t' + ulen + '\t' + spec + '\n';
                process.stdout.write(_out);
            }
            return match.kmers;
        } else {
            return;
        }
    }

    function removeWinnerKmers(matchKmers) {
        if (matchKmers) {
            // remove all kmers in best hit from kmerMap
            for (var kmer in matchKmers) {
                // matchKmers.forEach(function (kmer) {
                delete kmerMap[kmer];
                // kmerMap.delete(kmer);
            }
            // });
            return;
        } else {
            notFound = false;
            return;
        }
    }

    function getMatches(kmerObject, kmerQueryMap) {
        // let templates = new Map();
        var templates = Object.create(null);
        var nHits = 0;

        for (var sequence in kmerObject.firstMatches) {
            var _hit = kmerObject.firstMatches[sequence];
            // kmerObject.firstMatches.forEach(function (hit, sequence) {
            // let template = templates.get(sequence);
            var template = templates[sequence];
            var kmerCoverage = 0;
            for (var kmer in _hit.kmers) {
                // for (const kmer of hit.kmers){
                if (kmerCoverage = kmerQueryMap[kmer]) {
                    // let kmerCoverage = kmerQueryMap.get(kmer);
                    if (template !== undefined) {
                        template.tScore += kmerCoverage;
                        template.uScore += 1;
                        if (!(kmer in template.kmers)) {
                            template.kmers[kmer] = 1;
                            template.nKmers += 1;
                        }
                        // template.kmers.add(kmer);
                    } else {
                            templates[sequence] = {
                                tScore: kmerCoverage,
                                uScore: 1,
                                lengths: _hit.lengths,
                                ulength: _hit.ulength,
                                species: _hit.species,
                                kmers: { kmer: 1 },
                                nKmers: 1
                            };
                            // templates.set(sequence, {
                            //     tScore: kmerCoverage,
                            //     uScore: 1,
                            //     lengths: hit.lengths,
                            //     ulength: hit.ulength,
                            //     species: hit.species,
                            //     kmers: new Set([kmer])
                            // });
                            template = templates[sequence];
                            // template = templates.get(sequence);
                        }
                }
            }
            if (template !== undefined) {
                nHits += template.nKmers;
                // nHits += template.kmers.size;
            } else {
                    // delete kmerObject.firstMatches[sequence];
                    // kmerObject.firstMatches.delete(sequence);
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

    var loop = function loop() {
        while (notFound && hitCounter < kmerObject.maxHits) {
            var results = getMatches(kmerObject, kmerMap);
            var winnerKmers = findWinner(results);
            removeWinnerKmers(winnerKmers);
        }
        var end = (0, _performanceNow2.default)();
        kmerObject.wtaTime = end - start;
        if (kmerResults.length === 0) {
            throw new Error('No hits were found! (kmerResults.length === 0)');
        }
        return kmerResults;
    };

    return firstMatch(kmerObject, kmerMap).then(findWinner).then(removeWinnerKmers).then(loop);
}

/**
 * [standardScoring description]
 * @param  {[Object]} kmerObject [Instance of KmerServer]
 * @param  {[Map]}    kmerMap    [Dictionary of presence of Kmers]
 * @return {[type]}              [description]
 */
function standardScoring(kmerObject, kmerMap) {
    var kmerResults = [];
    return Promise.all([_mongoose2.default.model('Summary', kmerSummarySchema, 'Summary').findOne({
        templates: {
            $gt: 1
        }
    }, {
        _id: 0
    }).exec(), findMatchesMongoAggregation(kmerMap, kmerObject.db.url, kmerObject.collection, kmerObject.progress)]).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var summary = _ref2[0];
        var results = _ref2[1];

        kmerObject.firstMatches = results.templates;
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            for (var _iterator2 = results.templates[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                var _step2$value = _slicedToArray(_step2.value, 2);

                var sequence = _step2$value[0];
                var match = _step2$value[1];

                kmerResults.push(matchSummary(kmerObject, sequence, match, results, summary));
            }
        } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion2 && _iterator2.return) {
                    _iterator2.return();
                }
            } finally {
                if (_didIteratorError2) {
                    throw _iteratorError2;
                }
            }
        }

        return kmerResults.sort(sortKmerResults);
    });
}

var KmerFinderServer = exports.KmerFinderServer = function (_KmerJS) {
    _inherits(KmerFinderServer, _KmerJS);

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

    function KmerFinderServer(fastq) {
        var preffix = arguments.length <= 1 || arguments[1] === undefined ? 'ATGAC' : arguments[1];
        var length = arguments.length <= 2 || arguments[2] === undefined ? 16 : arguments[2];
        var step = arguments.length <= 3 || arguments[3] === undefined ? 1 : arguments[3];
        var coverage = arguments.length <= 4 || arguments[4] === undefined ? 1 : arguments[4];
        var progress = arguments.length <= 5 || arguments[5] === undefined ? true : arguments[5];
        var db = arguments.length <= 6 || arguments[6] === undefined ? 'mongo' : arguments[6];
        var url = arguments.length <= 7 || arguments[7] === undefined ? 'mongodb:\/\/localhost:27017/Kmers' : arguments[7];
        var collection = arguments.length <= 8 || arguments[8] === undefined ? 'genomes' : arguments[8];
        var method = arguments.length <= 9 || arguments[9] === undefined ? 'standard' : arguments[9];
        var maxHits = arguments.length <= 10 || arguments[10] === undefined ? 100 : arguments[10];

        _classCallCheck(this, KmerFinderServer);

        var _this = _possibleConstructorReturn(this, Object.getPrototypeOf(KmerFinderServer).call(this, fastq, preffix, length, step, coverage, progress, 'node'));

        _this.redis = _redis2.default.createClient({
            host: url.substring(8, 22),
            port: +url.substring(23, 28),
            url: url
        });
        _this.redis.on('error', function (err) {
            throw new Error(err);
        });
        _this.method = method;
        _this.collection = collection;
        _this.firstMatches = new Map();
        _this.maxHits = maxHits;
        _this.totalTime = 0.0;
        _this.dbQueryTime = 0.0;
        _this.wtaTime = 0.0;
        _this.fileSize = 0;
        _this.kmerMapSize = 0;
        _this.reducedDBSize = 0;
        return _this;
    }
    /**
     * [findKmers Wrapper around reading file function]
     * @return {[Map]} [Kmer Map]
     */


    _createClass(KmerFinderServer, [{
        key: 'findKmers',
        value: function findKmers() {
            return this.readFile().promise;
        }
        /**
         * [findAllMatches description]
         * @param  {[Map]}     kmerMap [Kmer Map]
         * @return {[Promise]}         [description]
         */

    }, {
        key: 'findMatches',
        value: function findMatches(kmerMap) {
            if (this.method === 'standard') {
                return standardScoring(this, kmerMap);
            } else if (this.method === 'winner') {
                return winnerScoring(this, kmerMap);
            } else {
                throw new Error('Scoring scheme unknown');
            }
        }
    }, {
        key: 'findFirstMatch',
        value: function findFirstMatch(kmerMap) {
            if (this.method === 'standard') {
                return standardScoring(this, kmerMap);
            } else if (this.method === 'winner') {
                return firstMatch(this, kmerMap);
            } else {
                throw new Error('Scoring scheme unknown');
            }
        }
    }, {
        key: 'findMatchesTest',
        value: function findMatchesTest(kmerMap) {
            return winnerScoring(this, kmerMap);
        }
    }, {
        key: 'kmerSize',
        value: function kmerSize() {
            return (0, _objectSizeof2.default)((0, _kmers.mapToJSON)(this.kmerMap));
        }
    }, {
        key: 'firstDBSize',
        value: function firstDBSize() {
            return (0, _objectSizeof2.default)((0, _kmers.mapToJSON)(this.firstMatches));
        }
    }, {
        key: 'close',
        value: function close() {
            this.conn.close();
        }
    }]);

    return KmerFinderServer;
}(_kmers.KmerJS);