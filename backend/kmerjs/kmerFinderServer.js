/* eslint no-underscore-dangle: [2, { "allow": ["_id", "_transform", "_lastLineData", "_flush"] }] */
// let fs = require('browserify-fs');
'use strict';

Object.defineProperty(exports, '__esModule', {
    value: true
});

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

var _createClass = (function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ('value' in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; })();

var _get = function get(_x9, _x10, _x11) { var _again = true; _function: while (_again) { var object = _x9, property = _x10, receiver = _x11; _again = false; if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { _x9 = parent; _x10 = property; _x11 = receiver; _again = true; desc = parent = undefined; continue _function; } } else if ('value' in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } } };

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

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

var Schema = _mongoose2['default'].Schema;

var kmerSchema = new Schema({
    lengths: Number,
    ulengths: Number,
    description: String,
    reads: Array
});

var kmerSummarySchema = new Schema({
    templates: Number,
    uniqueLens: Number,
    totalLen: Number,
    reads: Array
});

function findMatchesMongo(kmerMap, url, collection) {
    return new Promise(function (resolve, reject) {
        // let db = mongoose.connect(url, {
        //     server: { socketOptions: {keepAlive: 1}},
        //     replset: { socketOptions: {keepAlive: 1}}
        // });
        kmerSchema.index({ reads: 1 });
        kmerSchema.index({ sequence: 1 });
        var kmerDB = _mongoose2['default'].model('Kmer', kmerSchema, collection);
        var query = {
            reads: {
                $in: Array.from(kmerMap.keys())
            }
        };
        // Get unique and total matches
        var cursor = kmerDB.aggregate([{ $match: query }, { $limit: 30 }]);

        cursor.unwind('$reads').match(query).group({
            _id: { sequence: '$sequence', read: '$reads' },
            uScore: { $sum: 1 }
        })
        // .sort({uScore: -1})
        .exec(function (err, matches) {
            if (err === null) {
                var _iteratorNormalCompletion;

                var _didIteratorError;

                var _iteratorError;

                var _iterator, _step;

                (function () {
                    var hits = _lodash2['default'].reduce(matches, function (total, n) {
                        return total + n.uScore;
                    }, 0);
                    if (hits !== 0) {
                        (function () {
                            var templates = new Map();
                            _iteratorNormalCompletion = true;
                            _didIteratorError = false;
                            _iteratorError = undefined;

                            try {
                                for (_iterator = matches[Symbol.iterator](); !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                                    var temp = _step.value;

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

                            query = {
                                sequence: {
                                    $in: Array.from(templates.keys())
                                }
                            };
                            kmerDB.aggregate({ $match: query }).project({ id: '$sequence', lengths: 1, ulenght: 1, species: 1, _id: 0 }).exec(function (error, sequences) {
                                if (error === null) {
                                    var _iteratorNormalCompletion2 = true;
                                    var _didIteratorError2 = false;
                                    var _iteratorError2 = undefined;

                                    try {
                                        for (var _iterator2 = sequences[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
                                            var seq = _step2.value;

                                            var vals = templates.get(seq.id);
                                            vals.lengths = seq.lengths;
                                            vals.ulength = seq.ulenght;
                                            vals.species = seq.species;
                                            templates.set(seq.id, vals);
                                        }
                                        // db.disconnect();
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

                                    resolve({
                                        templates: templates,
                                        hits: hits
                                    });
                                } else {
                                    // db.disconnect();
                                    reject(error.message);
                                }
                            });
                        })();
                    } else {
                        // db.disconnect();
                        reject('No hits were found!');
                    }
                })();
            } else {
                // db.disconnect();
                reject(err.message);
            }
        });
    });
}

var KmerFinderServer = (function (_KmerJS) {
    _inherits(KmerFinderServer, _KmerJS);

    function KmerFinderServer(fastq) {
        var preffix = arguments.length <= 1 || arguments[1] === undefined ? 'ATGAC' : arguments[1];
        var length = arguments.length <= 2 || arguments[2] === undefined ? 16 : arguments[2];
        var step = arguments.length <= 3 || arguments[3] === undefined ? 1 : arguments[3];
        var coverage = arguments.length <= 4 || arguments[4] === undefined ? 1 : arguments[4];
        var out = arguments.length <= 5 || arguments[5] === undefined ? '' : arguments[5];
        var db = arguments.length <= 6 || arguments[6] === undefined ? 'mongo' : arguments[6];
        var url = arguments.length <= 7 || arguments[7] === undefined ? 'mongodb://localhost:27017/Kmers' : arguments[7];
        var collection = arguments.length <= 8 || arguments[8] === undefined ? 'genomes' : arguments[8];

        _classCallCheck(this, KmerFinderServer);

        _get(Object.getPrototypeOf(KmerFinderServer.prototype), 'constructor', this).call(this, preffix, length, step, coverage, out, 'node');
        this.fastq = fastq;
        // this.db = {
        //     type: db,
        //     url: url
        // };
        this.db = {
            connection: _mongoose2['default'].connect(url, {
                server: { socketOptions: { keepAlive: 120 } },
                replset: { socketOptions: { keepAlive: 120 } }
            }),
            type: db
        };
        this.collection = collection;
    }

    _createClass(KmerFinderServer, [{
        key: 'findKmers',
        value: function findKmers() {
            // this.db.connection.disconnect();
            return this.readLines();
        }
    }, {
        key: 'findMatches',
        value: function findMatches(kmerMap) {
            var minScore = 0;
            var url = this.db.url;
            var that = this;
            return new Promise(function (resolve, reject) {
                findMatchesMongo(kmerMap, url, that.collection).then(function (results) {
                    // let db = mongoose.connect(url);
                    var KmerSummary = _mongoose2['default'].model('Summary', kmerSummarySchema, 'Summary');
                    return KmerSummary.findOne({ templates: { $gt: 1 } }).exec(function (error, summary) {
                        if (error) {
                            _console2['default'].log(error);
                            reject(error);
                        }
                        // that.db.connection.close();
                        var kmerResults = [];
                        var _iteratorNormalCompletion3 = true;
                        var _didIteratorError3 = false;
                        var _iteratorError3 = undefined;

                        try {
                            for (var _iterator3 = results.templates[Symbol.iterator](), _step3; !(_iteratorNormalCompletion3 = (_step3 = _iterator3.next()).done); _iteratorNormalCompletion3 = true) {
                                var _step3$value = _slicedToArray(_step3.value, 2);

                                var sequence = _step3$value[0];
                                var match = _step3$value[1];

                                if (match.uScore > minScore) {
                                    var z = (0, _stats.zScore)(match.uScore, match.ulength, results.hits, summary.uniqueLens);
                                    var probability = (0, _stats.fastp)(z).times(summary.templates);
                                    var allow = that.evalue.cmp(probability); // p <= evalue
                                    if (allow >= 0) {
                                        var fracQ = new _bignumberJs2['default'](100).times(2).times(match.uScore).dividedBy(new _bignumberJs2['default'](that.uKmers).plus(_stats.etta));
                                        var fracD = new _bignumberJs2['default'](100).times(match.uScore).dividedBy(new _bignumberJs2['default'](match.ulength).plus(_stats.etta));
                                        // Console.log(fracQ);
                                        kmerResults.push(new Map([['template', sequence], ['score', match.uScore], ['expected', results.hits * match.ulength / summary.uniqueLens], ['z', z.toNumber()], ['probability', probability.toNumber()], ['frac-q', fracQ.toNumber()], ['frac-d', fracD.toNumber()], ['coverage', match.tScore / match.lengths], ['ulength', match.ulength],
                                        // ['total-frac-q', 100 * 2 * match.uScore / (that.uKmers + etta)],
                                        // ['total-frac-d', 100 * match.uScore / (match.ulength + etta)],
                                        // ['total-coverage', match.tScore / match.lengths],
                                        ['species', match.species]]));
                                    }
                                }
                            }
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

                        var sortedResults = kmerResults.sort(function (a, b) {
                            if (a.get('score') > b.get('score')) {
                                return -1;
                            }
                            if (a.get('score') < b.get('score')) {
                                return 1;
                            }
                            // a must be equal to b
                            return 0;
                        });
                        resolve(sortedResults);
                    });
                }, function (err) {
                    console.log(err); // Error: "It broke"
                });
            });
        }
    }]);

    return KmerFinderServer;
})(_kmersJs.KmerJS);

exports.KmerFinderServer = KmerFinderServer;