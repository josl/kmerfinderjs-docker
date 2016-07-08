'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.KmerFinderServer = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _console = require('console');

var _console2 = _interopRequireDefault(_console);

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

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

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) { arr2[i] = arr[i]; } return arr2; } else { return Array.from(arr); } } /* eslint no-underscore-dangle: [2, { "allow": ["_id", "_transform", "_lastLineData", "_flush", "emit"] }] */
// let fs = require('browserify-fs');


_bignumber2.default.config({ ROUNDING_MODE: 2 });
// import events from 'events';

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
/**
 * [extractKmers
     db.genomes.aggregate([
      {$match: {}},
      {$unwind: '$reads'},
      {$group: {
          _id: {read: '$reads'},
          templates: {
            $push: {
              sequence: '$sequence',
              lengths: '$lengths',
              ulengths: '$ulenght',
              species: '$species'
            }
          }
        }
      },
      {$project: {
          _id: 0, kmer: '$_id.read', templates: '$templates'
        }
      },
      {$out: 'KmerBacteria'}
    ], {
      allowDiskUse: true
    })
 * ]
 * @param  {[type]} kmerObject [description]
 * @return {[type]}            [description]
 */
function extractKmers(kmerObject) {
    return kmerObject.conn.model('Bacteria', kmerMapSchema, 'Bacteria').aggregate([{
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

function createSummary(kmerObject) {
    kmerObject.conn.model.aggregate([{ $unwind: "$templates" }, { $group: {
            _id: { sequence: { "templates": "$templates.sequence" } },
            count: { $sum: 1 }
        } }, { $group: {
            _id: null,
            count: { $sum: 1 }
        }
    }]);
    kmerObject.conn.model.aggregate([{ $unwind: "$templates" }, { $group: {
            _id: null,
            count: { $sum: "$templates.lengths" }
        }
    }]);
    kmerObject.conn.model.aggregate([{ $unwind: "$templates" }, { $group: {
            _id: null,
            count: { $sum: "$templates.ulengths" }
        }
    }]);
    return;
}

function findMatchesMapReduce(kmerMap, url, collection) {
    kmerMapSchema.index({ kmer: 1 });
    kmerMapSchema.index({ sequence: 1 });
    var kmerDB = _mongoose2.default.model(collection, kmerSchema, collection);
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

function updateTemplates(templates, hit, template, kmerCoverage) {
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
            kmers: new Set(hit.filteredKmers)
        });
    }
}

function findKmersMatchesRedis(kmerMap, client) {
    kmerMapSchema.index({ reads: 1 });
    kmerMapSchema.index({ 'templates.sequence': 1 });
    // let kmerDB = conn.model(collection, kmerMapSchema, collection);
    var kmerQuery = [].concat(_toConsumableArray(kmerMap.keys()));
    var templates = new Map();
    var nHits = 0;
    console.log('let\'s do it! ', kmerQuery.length);

    function updateMatches(matchTemplates, index) {
        var kmer = kmerQuery[index];
        nHits += matchTemplates.length;
        var kmerCoverage = kmerMap.get(kmer);
        matchTemplates.forEach(function (template) {
            template = JSON.parse(template);
            var sequence = templates.get(template.sequence);
            if (sequence !== undefined) {
                sequence.tScore += kmerCoverage;
                sequence.uScore += 1;
                sequence.kmers.add(kmer);
            } else {
                templates.set(template.sequence, {
                    tScore: kmerCoverage,
                    uScore: 1,
                    lengths: template.lengths,
                    ulength: template.ulengths,
                    species: template.species,
                    kmers: new Set([kmer])
                });
            }
        });
    }
    var promises = [];
    // start a separate batch command queue
    kmerQuery.forEach(function (kmer) {
        promises.push(['lrange', kmer, 0, -1]);
    });
    console.log('ready!');
    return client.batch(promises)
    // return client.batch(promises.slice(0, Math.round(promises.length/3)))
    .execAsync().then(function (results) {
        console.log('First', results.length);
        results.forEach(function (matchTemplates, index) {
            updateMatches(matchTemplates, index);
        });
        console.log('First', results.length);
        console.log(nHits);
        if (nHits === 0) {
            throw new Error('No hits were found!');
        }
        return {
            templates: templates,
            hits: nHits
        };
    });
    // .then(function (results) {
    //     console.log('First', results.length);
    //     results.forEach(function (matchTemplates, index) {
    //         updateMatches(matchTemplates, index);
    //     });
    //     console.log('First', results.length);
    //     return client
    //         .batch(promises.slice(Math.round(promises.length/3), Math.round(2*promises.length/3)))
    //         .execAsync();
    // })
    // .then(function (results) {
    //     console.log('Second', results.length);
    //     results.forEach(function (matchTemplates, index) {
    //         updateMatches(matchTemplates, index + Math.round(promises.length/3));
    //     });
    //     return client
    //         .batch(promises.slice(Math.round(2*promises.length/3), promises.length))
    //         .execAsync();
    // })
    // .then(function (results) {
    //     console.log('Third', results.length);
    //     results.forEach(function (matchTemplates, index) {
    //         updateMatches(matchTemplates, index + Math.round(2*promises.length/3));
    //     });
    //     console.log(nHits);
    //     if (nHits === 0) {
    //         throw new Error('No hits were found!');
    //     }
    //     return {
    //         templates: templates,
    //         hits: nHits
    //     };
    // });
    // kmerQuery.forEach(function (kmer) {
    //     promises.push(client.lrangeAsync(kmer, 0, -1));
    // });
    // console.log('promises ready');
    // return Promise.all(promises)
    //     .then(function(results) {
    //         results.forEach(function (matchTemplates, index) {
    //             let kmer = kmerQuery[index];
    //             nHits += matchTemplates.length;
    //             let kmerCoverage = kmerMap.get(kmer);
    //             matchTemplates.forEach(function (template) {
    //                 template = JSON.parse(template);
    //                 let sequence = templates.get(template.sequence);
    //                 if (sequence !== undefined){
    //                     sequence.tScore += kmerCoverage;
    //                     sequence.uScore += 1;
    //                     sequence.kmers.add(kmer);
    //                 }else {
    //                     templates.set(template.sequence, {
    //                         tScore: kmerCoverage,
    //                         uScore: 1,
    //                         lengths: template.lengths,
    //                         ulength: template.ulengths,
    //                         species: template.species,
    //                         kmers: new Set([kmer])
    //                     });
    //                 }
    //             });
    //         });
    //         if (nHits === 0) {
    //             throw new Error('No hits were found!');
    //         }
    //         console.log('hits! ', nHits);
    //         return {
    //             templates: templates,
    //             hits: nHits
    //         };
    //     });
}

function findKmersMatches(kmerMap, conn, collection) {
    kmerMapSchema.index({ reads: 1 });
    kmerMapSchema.index({ 'templates.sequence': 1 });
    var kmerDB = conn.model(collection, kmerMapSchema, collection);
    var kmerQuery = [].concat(_toConsumableArray(kmerMap.keys()));

    return new Promise(function (resolve, reject) {
        var cursor = kmerDB.aggregate([{
            $match: {
                kmer: {
                    $in: kmerQuery
                }
            }
        }]). // $type: 2 // BSON type (2) = String
        unwind('templates') // FIXME: Look into not unwind & postprocess in client
        .group({ // Apparently is faster than the alternative...
            _id: { template: '$templates' },
            filteredKmers: {
                $push: '$kmer'
            }
        }).project({
            _id: 0,
            template: '$_id.template.sequence',
            lengths: '$_id.template.lengths',
            ulengths: '$_id.template.ulengths',
            species: '$_id.template.species',
            filteredKmers: '$filteredKmers'
        }).allowDiskUse(true).cursor({ batchSize: 3000 }).exec();

        cursor.toArray(function (err, hits) {
            if (err) {
                reject(err);
            }
            var templates = new Map();
            var nHits = 0;
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = hits[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var hit = _step.value;

                    nHits += hit.filteredKmers.length;
                    for (var i = 0; i < hit.filteredKmers.length; i++) {
                        updateTemplates(templates, hit, templates.get(hit.template), kmerMap.get(hit.filteredKmers[i]));
                    }
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

            console.log(nHits);
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

function findKmersMatches2(kmerMap, conn, collection) {
    kmerMapSchema.index({ reads: 1 });
    kmerMapSchema.index({ 'templates.sequence': 1 });
    var kmerDB = conn.model(collection, kmerMapSchema, collection);
    var kmerQuery = [].concat(_toConsumableArray(kmerMap.keys()));

    return new Promise(function (resolve, reject) {
        var cursor = kmerDB.aggregate([{
            $match: {
                kmer: {
                    $in: kmerQuery
                }
            }
        }])
        // .unwind('templates') // FIXME: Look into not unwind & postprocess in client
        // .group({             // Apparently is faster than the alternative...
        //     _id: {template: '$templates'},
        //     filteredKmers:{
        //         $push: '$kmer'
        //     }
        // })
        // .project({
        //     _id: 0,
        //     template: '$templates.sequence',
        //     lengths: '$templates.lengths',
        //     ulengths: '$templates.ulengths',
        //     species: '$templates.species',
        //     kmer: '$kmer'
        // })
        . // $type: 2 // BSON type (2) = String
        allowDiskUse(true).cursor({ batchSize: 3000 }).exec();

        cursor.toArray(function (err, kmerHits) {
            if (err) {
                reject(err);
            }
            var templates = new Map();
            var nHits = 0;
            // let templateHits = new Map();
            kmerHits.forEach(function (hit) {
                var kmerCoverage = kmerMap.get(hit.kmer);
                hit.templates.forEach(function (kmerTemplate) {
                    var template = templates.get(kmerTemplate.sequence);
                    if (template !== undefined) {
                        template.tScore += kmerCoverage;
                        template.uScore += 1;
                        template.kmers.add(hit.kmer);
                    } else {
                        templates.set(kmerTemplate.sequence, {
                            tScore: kmerCoverage,
                            uScore: 1,
                            lengths: kmerTemplate.lengths,
                            ulength: kmerTemplate.ulengths,
                            species: kmerTemplate.species,
                            kmers: new Set([hit.kmer])
                        });
                        template = templates.get(kmerTemplate.sequence);
                    }
                    nHits += 1;
                });
            });

            //  for (let hit of hits){
            //     nHits += hit.filteredKmers.length;
            //     for (var i = 0; i < hit.filteredKmers.length; i++) {
            //         updateTemplates(
            //             templates, hit, templates.get(hit.template),
            //             kmerMap.get(hit.filteredKmers[i])
            //         );
            //     }
            // }
            console.log(nHits);
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

function findMatchesMongoAggregation(kmerMap, conn, collection) {
    kmerSchema.index({ reads: 1 });
    kmerSchema.index({ sequence: 1 });
    var kmerDB = conn.model(collection, kmerMapSchema, collection);
    var kmerQuery = [].concat(_toConsumableArray(kmerMap.keys()));

    return kmerDB.aggregate([{
        $match: {
            reads: {
                $in: kmerQuery
            }
        }
    }]).project({
        _id: 0, sequence: 1, lengths: 1, ulength: "$ulenght", species: 1,
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
        var _iteratorNormalCompletion2 = true;
        var _didIteratorError2 = false;
        var _iteratorError2 = undefined;

        try {
            var _loop = function _loop() {
                var hit = _step2.value;

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

            for (var _iterator2 = hits[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                _loop();
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

        if (nHits === 0) {
            throw new Error('No hits were found!');
        }
        var out = 'Hits: ' + nHits + ' / Templates: ' + hits.length + '\r';
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
    var kmerDB = _mongoose2.default.model(collection, kmerSchema, collection);
    var query = {
        reads: {
            // The $in operator selects the documents where the value of a field
            // equals any value in the specified array
            $in: [].concat(_toConsumableArray(kmerMap.keys()))
        }
    };
    // Get unique and total matches
    var templates = new Map();
    var hits = void 0;
    // Query to return matched templates
    var cursor = kmerDB.aggregate([{ $match: query }]);
    return cursor.unwind('reads').match(query).group({
        _id: { sequence: '$sequence', kmer: '$reads' },
        uScore: { $sum: 1 }
    }).exec().then(function (matches) {
        hits = _lodash2.default.reduce(matches, function (total, n) {
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

                    var kmer = temp._id.kmer;
                    var sequence = temp._id.sequence;
                    var match = templates.get(sequence);
                    var tCount = match ? match.tScore : 0;
                    var uCount = match ? match.uScore : 0;
                    tCount += kmerMap.get(kmer);
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
                    if (!_iteratorNormalCompletion3 && _iterator3.return) {
                        _iterator3.return();
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
                if (!_iteratorNormalCompletion4 && _iterator4.return) {
                    _iterator4.return();
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
    var kmerDB = _mongoose2.default.model(collection, kmerSchema, collection);
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
    var kmerQuerySize = kmerObject.kmerMapSize;
    var sequenceHit = kmerObject.firstMatches.get(sequence);
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
    kmerObject.redis.select(1);
    console.log('firstMatching!');
    return kmerObject.redis.hgetallAsync('Summary').then(function (summary) {
        console.log(summary);
        kmerObject.redis.select(0);
        kmerObject.summary = {
            templates: +summary.templates,
            totalLen: +summary.totalLen,
            uniqueLens: +summary.uniqueLens
        };
        console.log('summary ready!');
        return findKmersMatchesRedis(kmerMap, kmerObject.redis);
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

    function findWinner(results) {
        var templates = [].concat(_toConsumableArray(results.templates)).sort(sortKmerMatches);
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
            matchKmers.forEach(function (kmer) {
                kmerMap.delete(kmer);
            });
            return;
        } else {
            notFound = false;
            return;
        }
    }

    function getMatches(kmerObject, kmerQueryMap) {
        var templates = new Map();
        var nHits = 0;

        kmerObject.firstMatches.forEach(function (hit, sequence) {
            var template = templates.get(sequence);
            var _iteratorNormalCompletion5 = true;
            var _didIteratorError5 = false;
            var _iteratorError5 = undefined;

            try {
                for (var _iterator5 = hit.kmers[Symbol.iterator](), _step5; !(_iteratorNormalCompletion5 = (_step5 = _iterator5.next()).done); _iteratorNormalCompletion5 = true) {
                    var kmer = _step5.value;

                    if (kmerQueryMap.has(kmer)) {
                        var kmerCoverage = kmerQueryMap.get(kmer);
                        if (template !== undefined) {
                            template.tScore += kmerCoverage;
                            template.uScore += 1;
                            template.kmers.add(kmer);
                        } else {
                            templates.set(sequence, {
                                tScore: kmerCoverage,
                                uScore: 1,
                                lengths: hit.lengths,
                                ulength: hit.ulength,
                                species: hit.species,
                                kmers: new Set([kmer])
                            });
                            template = templates.get(sequence);
                        }
                    }
                }
            } catch (err) {
                _didIteratorError5 = true;
                _iteratorError5 = err;
            } finally {
                try {
                    if (!_iteratorNormalCompletion5 && _iterator5.return) {
                        _iterator5.return();
                    }
                } finally {
                    if (_didIteratorError5) {
                        throw _iteratorError5;
                    }
                }
            }

            if (template !== undefined) {
                nHits += template.kmers.size;
            } else {
                kmerObject.firstMatches.delete(sequence);
            }
        });
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
        if (kmerResults.length === 0) {
            throw new Error('No hits were found! (kmerResults.length === 0)');
        }
        console.log('kmerMapSize...', kmerObject.kmerMapSize);
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
    return Promise.all([_mongoose2.default.model('Summary', kmerSummarySchema, 'Summary').findOne({ templates: { $gt: 1 } }, { _id: 0 }).exec(), findMatchesMongoAggregation(kmerMap, kmerObject.db.url, kmerObject.collection, kmerObject.progress)]).then(function (_ref) {
        var _ref2 = _slicedToArray(_ref, 2);

        var summary = _ref2[0];
        var results = _ref2[1];

        kmerObject.firstMatches = results.templates;
        var _iteratorNormalCompletion6 = true;
        var _didIteratorError6 = false;
        var _iteratorError6 = undefined;

        try {
            for (var _iterator6 = results.templates[Symbol.iterator](), _step6; !(_iteratorNormalCompletion6 = (_step6 = _iterator6.next()).done); _iteratorNormalCompletion6 = true) {
                var _step6$value = _slicedToArray(_step6.value, 2);

                var sequence = _step6$value[0];
                var match = _step6$value[1];

                kmerResults.push(matchSummary(kmerObject, sequence, match, results, summary));
            }
        } catch (err) {
            _didIteratorError6 = true;
            _iteratorError6 = err;
        } finally {
            try {
                if (!_iteratorNormalCompletion6 && _iterator6.return) {
                    _iterator6.return();
                }
            } finally {
                if (_didIteratorError6) {
                    throw _iteratorError6;
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

        console.log(url);
        console.log(url.substring(8, 22));
        console.log(+url.substring(23, 28));
        _this.redis = _redis2.default.createClient({ host: url.substring(8, 22), port: +url.substring(23, 28), url: url });
        _this.redis.on("error", function (err) {
            throw new Error(err);
        });
        _this.method = method;
        _this.collection = collection;
        _this.firstMatches = new Map();
        _this.maxHits = maxHits;
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
        key: 'close',
        value: function close() {
            this.conn.close();
        }
    }]);

    return KmerFinderServer;
}(_kmers.KmerJS);