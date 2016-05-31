/* eslint no-underscore-dangle: [2, { "allow": ["_id", "_transform", "_lastLineData", "_flush", "emit"] }] */
// let fs = require('browserify-fs');
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x11, _x12, _x13) { var _again = true; _function: while (_again) { var object = _x11, property = _x12, receiver = _x13; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x11 = parent; _x12 = property; _x13 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError('Cannot call a class as a function'); } }

function _inherits(subClass, superClass) { if (typeof superClass !== 'function' && superClass !== null) { throw new TypeError('Super expression must either be null or a function, not ' + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _console = require('console');

var _console2 = _interopRequireDefault(_console);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _stats = require('./stats');

var _bignumberJs = require('bignumber.js');

var _bignumberJs2 = _interopRequireDefault(_bignumberJs);

var _mongoose = require('mongoose');

var _mongoose2 = _interopRequireDefault(_mongoose);

var _kmersJs = require('./kmers.js');

_bignumberJs2['default'].config({ ROUNDING_MODE: 2 });

var Schema = _mongoose2['default'].Schema;

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

function extractKmers() {
    return _mongoose2['default'].model('Bacteria', kmerMapSchema, 'Bacteria').aggregate([{
        $match: {}
    }]).unwind('reads').group({
        _id: { read: '$reads' },
        templates: {
            $push: {
                sequence: '$sequence',
                lengths: '$lengths',
                ulengths: '$ulenght',
                species: '$species'
            }
        }
    }).project({
        _id: 0, kmer: '$_id.read', templates: '$templates'
    }).out('KmerBacteria').allowDiskUse(true).exec();
}

function findMatchesMapReduce(kmerMap, url, collection) {
    kmerMapSchema.index({ kmer: 1 });
    kmerMapSchema.index({ sequence: 1 });
    var kmerDB = _mongoose2['default'].model(collection, kmerSchema, collection);
    var mapReduce = {};
    mapReduce.map = 'function () {\n        var matches = 0;\n        for (var i = 0; i < kmerQuery.length; i++) {\n            if (this.reads.indexOf(kmerQuery[i]) !== -1) {\n                matches += 1;\n            }\n        }\n        emit(\'test\', matches);\n    }';
    mapReduce.reduce = 'function (key, values) {\n            return Array.sum(values);\n    }';
    mapReduce.scope = {
        kmerQuery: [].concat(_toConsumableArray(kmerMap.keys()))
    };
    mapReduce.query = {
        reads: {
            // The $in operator selects the documents where the value of a field
            // equals any value in the specified array
            $in: [].concat(_toConsumableArray(kmerMap.keys()))
        }
    };
    return kmerDB.mapReduce(mapReduce, function (err, data) {
        console.log(err, data);
    });
}

function findKmersMatches(kmerMap, url, collection) {
    kmerMapSchema.index({ reads: 1 });
    kmerMapSchema.index({ 'templates.sequence': 1 });
    var kmerDB = _mongoose2['default'].model(collection, kmerMapSchema, collection);
    var kmerQuery = [].concat(_toConsumableArray(kmerMap.keys()));

    return new Promise(function (resolve, reject) {
        var cursor = kmerDB.aggregate([{
            $match: {
                kmer: {
                    $in: kmerQuery
                }
            }
        }]). // $type: 2 // BSON type (2) = String
        unwind('templates').group({
            _id: { template: '$templates' },
            filteredReads: {
                $push: '$kmer'
            }
        }).project({
            _id: 0,
            template: '$_id.template.sequence',
            lengths: '$_id.template.lengths',
            ulengths: '$_id.template.ulengths',
            species: '$_id.template.species',
            filteredReads: '$filteredReads'
        }).allowDiskUse(true).cursor({ batchSize: 1000 }).exec();

        cursor.toArray(function (err, hits) {
            var templates = new Map();
            var nHits = 0;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                var _loop = function () {
                    var hit = _step.value;

                    nHits += hit.filteredReads.length;
                    hit.filteredReads.forEach(function (read) {
                        var template = templates.get(hit.template);
                        var kmerCoverage = kmerMap.get(read);
                        if (template !== undefined) {
                            template.tScore += kmerCoverage;
                            template.uScore += 1;
                        } else {
                            templates.set(hit.template, {
                                tScore: kmerCoverage,
                                uScore: 1,
                                lengths: hit.lengths,
                                ulength: hit.ulengths,
                                species: hit.species,
                                reads: hit.filteredReads
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
                    if (!_iteratorNormalCompletion && _iterator['return']) {
                        _iterator['return']();
                    }
                } finally {
                    if (_didIteratorError) {
                        throw _iteratorError;
                    }
                }
            }

            if (nHits === 0) {
                reject('No hits were found!');
            }
            resolve({
                templates: templates,
                hits: nHits
            });
        });
    });
}
function findMatchesMongoAggregation(kmerMap, url, collection, progress) {
    kmerSchema.index({ reads: 1 });
    kmerSchema.index({ sequence: 1 });
    var kmerDB = _mongoose2['default'].model(collection, kmerSchema, collection);
    var kmerQuery = [].concat(_toConsumableArray(kmerMap.keys()));

    return kmerDB.aggregate([{
        $match: {
            reads: {
                $in: kmerQuery
            }
        }
    }]).project({
        _id: 0, sequence: 1, lengths: 1, ulength: "$ulenght", species: 1,
        filteredReads: {
            $filter: {
                input: "$reads",
                as: "read",
                cond: {
                    $setIsSubset: [{
                        $map: {
                            input: {
                                "$literal": ["single_element"]
                            },
                            as: "el",
                            'in': "$$read"
                        }
                    }, kmerQuery]
                }
            }
        }
    }).exec().then(function (hits) {
        var templates = new Map();
        var nHits = 0;
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            var _loop2 = function () {
                var hit = _step2.value;

                nHits += hit.filteredReads.length;
                hit.filteredReads.forEach(function (read) {
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
                            reads: hit.filteredReads
                        });
                    }
                });
            };

            for (var _iterator2 = hits[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                _loop2();
            }
        } catch (err) {
            _didIteratorError2 = true;
            _iteratorError2 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion2 && _iterator2['return']) {
                    _iterator2['return']();
                }
            } finally {
                if (_didIteratorError2) {
                    throw _iteratorError2;
                }
            }
        }

        if (nHits === 0) {
            throw new Error('No hits were found!');
        }
        var out = 'Hits: ' + nHits + ' / Templates: ' + hits.length + '\r';
        if (progress) {
            process.stdout.write(out);
        }
        return {
            templates: templates,
            hits: nHits
        };
    });
}

/**
 * [findMatchesMongo description]
 * @param  {[type]} kmerMap    [Dictionary of presence of Kmers]
 * @param  {[type]} url        [description]
 * @param  {[type]} collection [description]
 * @return {[type]}            [description]
 */
function findMatchesMongo(kmerMap, url, collection) {
    var limit = arguments.length <= 3 || arguments[3] === undefined ? 0 : arguments[3];

    kmerSchema.index({ reads: 1 });
    kmerSchema.index({ sequence: 1 });
    var kmerDB = _mongoose2['default'].model(collection, kmerSchema, collection);
    var query = {
        reads: {
            // The $in operator selects the documents where the value of a field
            // equals any value in the specified array
            $in: [].concat(_toConsumableArray(kmerMap.keys()))
        }
    };
    // Get unique and total matches
    var templates = new Map();
    var hits = undefined;
    // Query to return matched templates
    var cursor = kmerDB.aggregate([{ $match: query }]);
    return cursor.unwind('reads').match(query).group({
        _id: { sequence: '$sequence', read: '$reads' },
        uScore: { $sum: 1 }
    }).exec().then(function (matches) {
        hits = _lodash2['default'].reduce(matches, function (total, n) {
            return total + n.uScore;
        }, 0);
        console.log('Hits found: ', hits);
        if (hits !== 0) {
            var _iteratorNormalCompletion3 = true;
            var _didIteratorError3 = false;
            var _iteratorError3 = undefined;

            try {
                for (var _iterator3 = matches[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                    var temp = _step3.value;

                    var read = temp._id.read;
                    var sequence = temp._id.sequence;
                    var match = templates.get(sequence);
                    var tCount = match ? match.tScore : 0;
                    var uCount = match ? match.uScore : 0;
                    tCount += kmerMap.get(read);
                    uCount += 1;
                    templates.set(sequence, {
                        tScore: tCount, uScore: uCount
                    });
                }
                // Get unique, total lenghts & species per match
            } catch (err) {
                _didIteratorError3 = true;
                _iteratorError3 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion3 && _iterator3['return']) {
                        _iterator3['return']();
                    }
                } finally {
                    if (_didIteratorError3) {
                        throw _iteratorError3;
                    }
                }
            }

            query = {
                sequence: {
                    $in: Array.from(templates.keys())
                }
            };
            var projection = {
                id: '$sequence', lengths: 1, ulenght: 1,
                species: 1, _id: 0
            };
            return kmerDB.aggregate({ $match: query }).project(projection).exec();
        } else {
            throw new Error('No hits were found!');
        }
    }).then(function (sequences) {
        var _iteratorNormalCompletion4 = true;
        var _didIteratorError4 = false;
        var _iteratorError4 = undefined;

        try {
            for (var _iterator4 = sequences[Symbol.iterator](), _step4; !(_iteratorNormalCompletion4 = (_step4 = _iterator4.next()).done); _iteratorNormalCompletion4 = true) {
                var seq = _step4.value;

                var vals = templates.get(seq.id);
                vals.lengths = seq.lengths;
                vals.ulength = seq.ulenght;
                vals.species = seq.species;
                templates.set(seq.id, vals);
            }
        } catch (err) {
            _didIteratorError4 = true;
            _iteratorError4 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion4 && _iterator4['return']) {
                    _iterator4['return']();
                }
            } finally {
                if (_didIteratorError4) {
                    throw _iteratorError4;
                }
            }
        }

        return {
            templates: templates,
            hits: hits
        };
    });
}
/**
 * [findKmersTemplate Queries DB for matche's kmers]
 * @param  {[String]} template [Sequence template]
 * @return {[Array]}           [Array of kmers]
 */
function findKmersTemplate(template, collection) {
    // let kmerDB = mongoose.model(collection, kmerMapSchema, collection);
    // return kmerDB.find({'templates.sequence': template}).exec();
    var kmerDB = _mongoose2['default'].model(collection, kmerSchema, collection);
    return kmerDB.findOne({ sequence: template }, { reads: 1 }).exec();
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
    if (match.uScore > minScore) {
        var z = (0, _stats.zScore)(match.uScore, match.ulength, results.hits, summary.uniqueLens);
        var probability = (0, _stats.fastp)(z).times(summary.templates);
        var allow = kmerObject.evalue.cmp(probability); // p <= evalue
        if (allow >= 0) {
            var fracQ = new _bignumberJs2['default'](100).times(2).times(match.uScore).dividedBy(new _bignumberJs2['default'](kmerObject.kmerMap.size).plus(_stats.etta));
            var fracD = new _bignumberJs2['default'](100).times(match.uScore).dividedBy(new _bignumberJs2['default'](match.ulength).plus(_stats.etta));
            var totFracQ = new _bignumberJs2['default'](100).times(2).times(kmerObject.firstMatches.get(sequence).uScore).dividedBy(new _bignumberJs2['default'](kmerObject.kmerMap.size).plus(_stats.etta));
            var totFracD = new _bignumberJs2['default'](100).times(kmerObject.firstMatches.get(sequence).uScore).dividedBy(new _bignumberJs2['default'](match.ulength).plus(_stats.etta));
            var totFracCov = new _bignumberJs2['default'](kmerObject.firstMatches.get(sequence).tScore).dividedBy(match.lengths).round(2).toNumber();
            var expected = new _bignumberJs2['default'](results.hits).times(match.ulength).dividedBy(summary.uniqueLens);
            return new Map([['template', sequence], ['score', match.uScore], ['expected', expected.round(0, 1).toNumber()], ['z', z.round(2).toNumber()], ['probability', probability.toNumber()], ['frac-q', fracQ.round(2, 2).toNumber()], ['frac-d', fracD.round(2).toNumber()], ['depth', new _bignumberJs2['default'](match.tScore).dividedBy(match.lengths).round(2).toNumber()], ['kmers-template', match.ulength], ['total-frac-q', totFracQ.round(2, 2).toNumber()], ['total-frac-d', totFracD.round(2).toNumber()], ['total-temp-cover', totFracCov], ['species', match.species]]);
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

/**
 * [winnerScoringRecursive]
 * @param  {[Object]} summary    [Summary query from DB]
 * @param  {[Map]}    kmerMap    [Dictionary of presence of Kmers]
 * @param  {[Object]} kmerObject [Instance of KmerServer]
 * @return {[type]}              [description]
 */
function winnerScoringRecursive(summary, kmerMap, kmerObject) {
    var hitCounter = 0;
    var notFound = true;
    var maxHits = 100;
    var kmerResults = [];

    function findWinner(results) {
        var templates = [].concat(_toConsumableArray(results.templates)).sort(sortKmerMatches);
        if (hitCounter === 0) {
            kmerObject.firstMatches = results.templates;
            if (kmerObject.progress) {
                var out = 'Template\tScore\tExpected\tz\tp_value\tquery\tcoverage [%]\ttemplate coverage [%]\tdepth\tKmers in Template\tDescription\n';
                process.stdout.write(out);
            }
        }
        var winner = matchSummary(kmerObject, templates[0][0], templates[0][1], results, summary);
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
                var out = seq + '\t' + score + '\t' + expec + '\t' + z + '\t' + p + '\t' + fracQ + '\t\'' + fracD + '\t' + cov + '\t' + ulen + '\t' + spec + '\n';
                process.stdout.write(out);
            }
            return results.templates.get(winner.get('template')).reads;
        } else {
            return;
        }
    }

    function removeWinnerKmers(matchReads) {
        if (matchReads) {
            // remove all kmers in best hit from kmerMap
            matchReads.forEach(function (kmer) {
                kmerMap['delete'](kmer);
            });
            return;
        } else {
            notFound = false;
            return;
        }
    }

    function getMatches(kmerObject, kmerMap) {
        var templates = new Map();
        var nHits = 0;
        var queryKmers = [].concat(_toConsumableArray(kmerMap.keys()));

        kmerObject.firstMatches.forEach(function (hit, sequence) {
            var filteredReads = _lodash2['default'].intersection(hit.reads, queryKmers);
            nHits += filteredReads.length;
            filteredReads.forEach(function (read) {
                var template = templates.get(sequence);
                var kmerCoverage = kmerMap.get(read);
                if (template !== undefined) {
                    template.tScore += kmerCoverage;
                    template.uScore += 1;
                } else {
                    templates.set(sequence, {
                        tScore: kmerCoverage,
                        uScore: 1,
                        lengths: hit.lengths,
                        ulength: hit.ulength,
                        species: hit.species,
                        reads: filteredReads
                    });
                }
            });
        });
        if (nHits === 0) {
            throw new Error('No hits were found!');
        }
        // let out = `Hits: ${nHits} / Templates: ${templates.size}\r`;
        // if (kmerObject.progress) {
        //     process.stdout.write(out);
        // }
        return {
            templates: templates,
            hits: nHits
        };
    }

    var loop = function loop() {
        var _again2 = true;

        _function2: while (_again2) {
            _again2 = false;

            if (!(notFound && hitCounter < maxHits)) {
                if (kmerResults.length === 0) {
                    throw new Error('No hits were found!');
                }
                return kmerResults.sort(sortKmerResults);
            } else {
                // Find new matches from first matches.
                var results = getMatches(kmerObject, kmerMap);
                var winnerKmers = findWinner(results);
                removeWinnerKmers(winnerKmers);
                _again2 = true;
                results = winnerKmers = undefined;
                continue _function2;
            }
        }
    };
    return findKmersMatches(kmerMap, kmerObject.db.url, kmerObject.collection, kmerObject.progress).then(findWinner).then(removeWinnerKmers).then(loop);
}
/**
 * [winnerScoring Winner takes All scoring scheme]
 * @param  {[type]} kmerObject [KmerJS Object]
 * @param  {[type]} kmerMap    [DNA sequence in Kmer space]
 * @return {[type]}            [Promise]
 */
function winnerScoring(kmerObject, kmerMap) {
    return _mongoose2['default'].model('Summary', kmerSummarySchema, 'Summary').findOne({ templates: { $gt: 1 } }, { _id: 0 }).then(function (summary) {
        return winnerScoringRecursive(summary, kmerMap, kmerObject);
    });
}

/**
 * [standardScoring description]
 * @param  {[Object]} kmerObject [Instance of KmerServer]
 * @param  {[Map]}    kmerMap    [Dictionary of presence of Kmers]
 * @return {[type]}              [description]
 */
function standardScoring(kmerObject, kmerMap) {
    var kmerResults = [];
    return Promise.all([_mongoose2['default'].model('Summary', kmerSummarySchema, 'Summary').findOne({ templates: { $gt: 1 } }, { _id: 0 }).exec(), findMatchesMongoAggregation(kmerMap, kmerObject.db.url, kmerObject.collection, kmerObject.progress)]).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var summary = _ref2[0];
        var results = _ref2[1];

        kmerObject.firstMatches = results.templates;
        var _iteratorNormalCompletion5 = true;
        var _didIteratorError5 = false;
        var _iteratorError5 = undefined;

        try {
            for (var _iterator5 = results.templates[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                var _step5$value = _slicedToArray(_step5.value, 2);

                var sequence = _step5$value[0];
                var match = _step5$value[1];

                kmerResults.push(matchSummary(kmerObject, sequence, match, results, summary));
            }
        } catch (err) {
            _didIteratorError5 = true;
            _iteratorError5 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion5 && _iterator5['return']) {
                    _iterator5['return']();
                }
            } finally {
                if (_didIteratorError5) {
                    throw _iteratorError5;
                }
            }
        }

        return kmerResults.sort(sortKmerResults);
    });
}

var KmerFinderServer = (function (_KmerJS) {
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

        _classCallCheck(this, KmerFinderServer);

        _get(Object.getPrototypeOf(KmerFinderServer.prototype), 'constructor', this).call(this, fastq, preffix, length, step, coverage, progress, 'node');
        this.db = {
            connection: _mongoose2['default'].connect(url, {
                server: { socketOptions: { keepAlive: 120 } },
                replset: { socketOptions: { keepAlive: 120 } }
            }),
            type: db
        };
        this.method = method;
        this.collection = collection;
        this.firstMatches = new Map();
    }

    /**
     * [findKmers Wrapper around reading file function]
     * @return {[Map]} [Kmer Map]
     */

    _createClass(KmerFinderServer, [{
        key: 'findKmers',
        value: function findKmers() {
            return this.readFile();
        }

        /**
         * [findMatches description]
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
        key: 'findMatchesTest',
        value: function findMatchesTest(kmerMap) {
            return winnerScoring(this, kmerMap);
        }
    }, {
        key: 'close',
        value: function close() {
            this.db.connection.disconnect();
        }
    }]);

    return KmerFinderServer;
})(_kmersJs.KmerJS);

exports.KmerFinderServer = KmerFinderServer;