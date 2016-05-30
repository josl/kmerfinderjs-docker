'use strict';

var _slicedToArray = (function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i['return']) _i['return'](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError('Invalid attempt to destructure non-iterable instance'); } }; })();

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _toConsumableArray(arr) { if (Array.isArray(arr)) { for (var i = 0, arr2 = Array(arr.length); i < arr.length; i++) arr2[i] = arr[i]; return arr2; } else { return Array.from(arr); } }

var _libKmerFinderServer = require('./kmerFinderServer.js');

var _console = require('console');

var _console2 = _interopRequireDefault(_console);

var cli = require('cli');

cli.parse({
    fastq: ['f', 'FASTQ file to parse', 'file', 'test_data/test_long.fastq'],
    preffix: ['p', 'Kmer preffix', 'string', 'ATGAC'],
    length: ['l', 'Kmer lenght', 'number', 16],
    step: ['s', 'Kmer step', 'number', 1],
    coverage: ['c', 'Min coverage', 'number', 1],
    output: ['o', 'Print info', 'number', 1],
    program: ['P', 'Program to execute: [findKmers, findMatches]', 'string', 'findMatches'],
    score: ['S', 'Score to execute: [standard, winner]', 'string', 'winner'],
    database: ['d', 'Database to query: [Bacteria, Virus...]', 'string', 'KmerMap'],
    url: ['u', 'Url of the database', 'string', 'mongodb://localhost:27017/Kmers']
});

cli.main(function (args, options) {
    var kmerjs = new _libKmerFinderServer.KmerFinderServer(options.fastq, options.preffix, options.length, options.step, options.coverage, options.output, 'mongo', options.url, options.database, options.score);
    if (options.program === 'findKmers') {
        kmerjs.findKmers().then(function (kmerMap) {
            var keys = [].concat(_toConsumableArray(kmerMap.keys()));
            _console2['default'].log('\n' + 'Unique Kmers: ', keys.length);
            _console2['default'].log('Let\'s look at the top 10');
            var i = 0;
            var sortedArray = [].concat(_toConsumableArray(kmerMap)).sort(function (a, b) {
                return b[1] - a[1];
            });
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
                for (var _iterator = sortedArray[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                    var _step$value = _slicedToArray(_step.value, 2);

                    var k = _step$value[0];
                    var v = _step$value[1];

                    // We don’t escape the key '__proto__'
                    // which can cause problems on older engines
                    _console2['default'].log(k, v);
                    i += 1;
                    if (i === 10) {
                        break;
                    }
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

            kmerjs.close();
            process.exit();
        });
    } else if (options.program === 'findMatches') {
        kmerjs.findKmers().then(function (kmerMap) {
            var keys = [].concat(_toConsumableArray(kmerMap.keys()));
            _console2['default'].log('Kmers: ', keys.length);
            kmerjs.findMatches(kmerMap).then(function (output) {
                _console2['default'].log('Template\tScore\tExpected\tz\tp_value\tquery\tcoverage [%]\ttemplate coverage [%]\tdepth\tKmers in Template\tDescription');
                output.forEach(function (data) {
                    var seq = data.get('template');
                    var score = data.get('score');
                    var expec = data.get('expected');
                    var z = data.get('z');
                    var p = data.get('probability');
                    var fracQ = data.get('frac-q');
                    var fracD = data.get('frac-d');
                    var cov = data.get('depth');
                    var ulen = data.get('kmers-template');
                    var spec = data.get('species');
                    _console2['default'].log(seq + '\t' + score + '\t' + expec + '\t' + z + '\t' + p + '\t' + fracQ + '\t' + fracD + '\t' + cov + '\t' + ulen + '\t' + spec + '\t');
                });
                kmerjs.close();
                process.exit();
            });
        });
    } else {
        _console2['default'].log(options.program + ' is not a valid option! [findKmers, findMatches]');
    }
});
