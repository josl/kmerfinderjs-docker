'use strict';

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.KmerJS = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }(); /* eslint no-underscore-dangle: [2, { "allow": ["_id", "_transform", "_lastLineData", "_flush"] }] */

exports.jsonToStrMap = jsonToStrMap;
exports.complement = complement;
exports.stringToMap = stringToMap;
exports.objectToMap = objectToMap;
exports.mapToJSON = mapToJSON;

var _bignumber = require('bignumber.js');

var _bignumber2 = _interopRequireDefault(_bignumber);

var _bluebird = require('bluebird');

var _bluebird2 = _interopRequireDefault(_bluebird);

var _stream = require('stream');

var _stream2 = _interopRequireDefault(_stream);

var _filereaderStream = require('filereader-stream');

var _filereaderStream2 = _interopRequireDefault(_filereaderStream);

var _progressStream = require('progress-stream');

var _progressStream2 = _interopRequireDefault(_progressStream);

var _performanceNow = require('performance-now');

var _performanceNow2 = _interopRequireDefault(_performanceNow);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var fs = require('fs');


// export let complementMap = new Map([
//     ['A', 'T'],
//     ['T', 'A'],
//     ['G', 'C'],
//     ['C', 'G']
// ]);

var complementMap = {
    'A': 'T',
    'T': 'A',
    'G': 'C',
    'C': 'G'
};

var regex = /[ATGC]/g;

function objToStrMap(obj) {
    var strMap = new Map();
    var _iteratorNormalCompletion = true;
    var _didIteratorError = false;
    var _iteratorError = undefined;

    try {
        for (var _iterator = Object.keys(obj)[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var k = _step.value;

            strMap.set(k, obj[k]);
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

    return strMap;
}

function jsonToStrMap(jsonStr) {
    return objToStrMap(jsonStr);
}

// Source:
// http://eddmann.com/posts/ten-ways-to-reverse-a-string-in-javascript/
String.prototype.reverse = function () {
    var i,
        s = '';
    for (i = this.length; i >= 0; i--) {
        s += this.charAt(i);
    }
    return s;
};

function complement(string) {
    return string.replace(regex, function (match) {
        return complementMap[match];
        // return complementMap.get(match);
    }).reverse();
    // .split('')
    // .reverse()
    // .join('');
}

function stringToMap(string) {
    return objToStrMap(JSON.parse(string));
}
function objectToMap(object) {
    return objToStrMap(object);
}
// Source: http://exploringjs.com/es6/ch_maps-sets.html
function mapToJSON(strMap) {
    var obj = Object.create(null);
    var _iteratorNormalCompletion2 = true;
    var _didIteratorError2 = false;
    var _iteratorError2 = undefined;

    try {
        for (var _iterator2 = strMap[Symbol.iterator](), _step2; !(_iteratorNormalCompletion2 = (_step2 = _iterator2.next()).done); _iteratorNormalCompletion2 = true) {
            var _step2$value = _slicedToArray(_step2.value, 2);

            var k = _step2$value[0];
            var v = _step2$value[1];

            // We don’t escape the key '__proto__'
            // which can cause problems on older engines
            obj[k] = v;
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

    return obj;
}

var KmerJS = exports.KmerJS = function () {
    /**
     * [constructor description]
     * @param  {[type]} preffix  =             'ATGAC' [Filter kmers starting with]
     * @param  {[type]} length   =             16      [Lenght of kmer: 16-mer]
     * @param  {[type]} step     =             1       [Overlapping kmers of step STEP]
     * @param  {[type]} coverage =             1       [minimun coverage]
     * @param  {[type]} out      =             ''      [description]
     * @param  {[type]} env      =             'node'  [description]
     * @return {[type]}          [description]
     */

    function KmerJS() {
        var fastq = arguments.length <= 0 || arguments[0] === undefined ? '' : arguments[0];
        var preffix = arguments.length <= 1 || arguments[1] === undefined ? 'ATGAC' : arguments[1];
        var length = arguments.length <= 2 || arguments[2] === undefined ? 16 : arguments[2];
        var step = arguments.length <= 3 || arguments[3] === undefined ? 1 : arguments[3];
        var coverage = arguments.length <= 4 || arguments[4] === undefined ? 1 : arguments[4];
        var progress = arguments.length <= 5 || arguments[5] === undefined ? true : arguments[5];
        var env = arguments.length <= 6 || arguments[6] === undefined ? 'node' : arguments[6];

        _classCallCheck(this, KmerJS);

        this.fastq = fastq;
        this.preffix = preffix;
        this.kmerLength = length;
        this.step = step;
        this.progress = progress;
        this.coverage = coverage;
        this.evalue = new _bignumber2.default(0.05);
        this.kmerMap = Object.create(null);
        // this.kmerMap = new Map(); // [Map object: {16-mer: times found in line}]
        this.kmerMapSize = 0;
        this.env = env;
        if (env === 'browser') {
            this.fileDataRead = 0;
        }
        this.kmerExtractTime = 0.0;
    }
    /**
     * [kmersInLine description]
     * @param  {[string]} line [Sequence read: ATGACCTGAGAGCCTT]
     * @return {[type]}      [description]
     */


    _createClass(KmerJS, [{
        key: 'kmersInLine',
        value: function kmersInLine(line) {
            var ini = 0;
            var end = this.kmerLength;
            var stop = line.length - this.kmerLength;
            for (var index = 0; index <= stop; index += 1) {
                var kmer = line.substring(ini, end);
                if (kmer.startsWith(this.preffix)) {
                    this.kmerMap[kmer] = (this.kmerMap[kmer] || 0) + 1;
                    this.kmerMapSize += 1;
                    // this.kmerMap.set(kmer, (this.kmerMap.get(kmer) || 0) + 1);
                }
                ini += this.step;
                end = ini + this.kmerLength;
            }
        }
        /**
         * [readFile extract Kmers from file.]
         * @return {[type]} [description]
         */

    }, {
        key: 'readFile',
        value: function readFile() {
            var start = (0, _performanceNow2.default)();
            var kmerObj = this;
            var str = (0, _progressStream2.default)({
                time: 100 /* ms */
            });
            var promise = new _bluebird2.default(function (resolve) {
                // Source: https://strongloop.com/strongblog/practical-examples-of-the-new-node-js-streams-api/
                var liner = new _stream2.default.Transform({ objectMode: true });
                liner._transform = function (chunk, encoding, done) {
                    var data = chunk.toString();
                    if (this._lastLineData) {
                        data = this._lastLineData + data;
                    }
                    var lines = data.split('\n');
                    this._lastLineData = lines.splice(lines.length - 1, 1)[0];

                    lines.forEach(this.push.bind(this));
                    done();
                };
                liner._flush = function (done) {
                    if (this._lastLineData) {
                        this.push(this._lastLineData);
                    }
                    this._lastLineData = null;
                    done();
                };
                if (kmerObj.env === 'node') {
                    fs.createReadStream(kmerObj.fastq).pipe(liner);
                } else if (kmerObj.env === 'browser') {
                    (0, _filereaderStream2.default)(kmerObj.fastq).pipe(liner);
                }
                // if (kmerObj.env === 'node'){
                //     fs.createReadStream(kmerObj.fastq).pipe(str).pipe(liner);
                // }else if (kmerObj.env === 'browser') {
                //     fileReaderStream(kmerObj.fastq).pipe(str).pipe(liner);
                // }
                var i = 0;
                var lines = 0;
                kmerObj.lines = 0;
                kmerObj.bytesRead = 0;
                kmerObj.linesPerChunk = 0;
                liner.on('readable', function () {
                    var line = void 0;
                    while (null !== (line = liner.read())) {
                        if (i === 1 && line.length > 1) {
                            // kmerObj.kmersInLine(line, kmerObj.kmerMap,
                            //        kmerObj.length,kmerObj.preffix, kmerObj.step);
                            // kmerObj.kmersInLine(complement(line), kmerObj.kmerMap,
                            //       kmerObj.length,kmerObj.preffix, kmerObj.step);
                            [line, complement(line)].forEach(function (kmerLine) {
                                kmerObj.kmersInLine(kmerLine, kmerObj.kmerMap, kmerObj.length, kmerObj.preffix, kmerObj.step);
                            });
                        } else if (i === 3) {
                            i = -1;
                        }
                        i += 1;
                        lines += 1;
                        kmerObj.lines = lines;
                        if (kmerObj.env === 'node' && kmerObj.progress) {
                            var progress = 'Lines: ' + lines + ' / Kmers: ' + kmerObj.kmerMapSize + '\r';
                            process.stdout.write(progress);
                        }
                    }
                });
                liner.on('end', function () {
                    var end = (0, _performanceNow2.default)();
                    kmerObj.kmerExtractTime = end - start;
                    // Clean up progress output
                    if (kmerObj.env === 'node' && kmerObj.progress) {
                        process.stdout.write('\n                               \n');
                    }
                    // kmerObj.kmerMapSize = Object.keys(kmerObj.kmerMap).length;
                    // kmerObj.kmerMapSize = kmerObj.kmerMap.size;
                    resolve(kmerObj.kmerMap);
                });
            });
            return {
                promise: promise,
                event: str
            };
        }
    }]);

    return KmerJS;
}();