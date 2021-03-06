/* eslint no-underscore-dangle: [2, { "allow": ["_id", "_transform", "_lastLineData", "_flush"] }] */

let BN = require('bignumber.js');
let Promise = require('bluebird');
let stream = require('stream');
const fs = require('fs');
let fileReaderStream = require('filereader-stream');
let progressEvent = require('progress-stream');
let now = require('performance-now');


let complementMap =  {
    'A': 'T',
    'T': 'A',
    'G': 'C',
    'C': 'G'
};

let regex = /[ATGC]/g;

function objToStrMap(obj) {
    let strMap = new Map();
    for (let k of Object.keys(obj)) {
        strMap.set(k, obj[k]);
    }
    return strMap;
}

function jsonToStrMap(jsonStr) {
    return objToStrMap(jsonStr);
}

// Source:
// http://eddmann.com/posts/ten-ways-to-reverse-a-string-in-javascript/
String.prototype.reverse = function() {
    // let s = this;
    // let o = '';
    // for (var i = s.length - 1; i >= 0; i--){
    //   o += s[i];
    // }
    // return o;
    var s = this;
    s = s.split('');
      var len = s.length,
          halfIndex = Math.floor(len / 2) - 1,
          tmp;
      for (var i = 0; i <= halfIndex; i++) {
        tmp = s[len - i - 1];
        s[len - i - 1] = s[i];
        s[i] = tmp;
      }
      return s.join('');
};

function complement(string) {
    return string.replace(regex, function (match) {
        return complementMap[match];
    })
    .reverse();
}

function stringToMap(string) {
    return objToStrMap(JSON.parse(string));
}
function objectToMap(object) {
    return objToStrMap(object);
}
// Source: http://exploringjs.com/es6/ch_maps-sets.html
function mapToJSON(strMap) {
    let obj = Object.create(null);
    for (let [k, v] of strMap) {
        // We don’t escape the key '__proto__'
        // which can cause problems on older engines
        obj[k] = v;
    }
    return obj;
}


class KmerJS {
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
    constructor(fastq ='', preffix = 'ATGAC', length = 16, step = 1,
                coverage = 1, progress = true, env = 'node') {
        this.fastq = fastq;
        this.preffix = preffix;
        this.kmerLength = length;
        this.step = step;
        this.progress = progress;
        this.coverage = coverage;
        this.evalue = new BN(0.05);
        this.kmerMap = Object.create(null); // {16-mer: times found in line}
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
    kmersInLine(line) {
        let ini = 0;
        let end = this.kmerLength;
        let stop = line.length - this.kmerLength;
        for (let index = 0; index <= stop; index += 1) {
            let kmer = line.substring(ini, end);
            if (kmer.startsWith(this.preffix)) {
                this.kmerMap[kmer] = (this.kmerMap[kmer] || 0) + 1;
                this.kmerMapSize += 1;
            }
            ini += this.step;
            end = ini + this.kmerLength;
        }
    }
    /**
     * [readFile extract Kmers from file.]
     * @return {[type]} [description]
     */

    readFile() {
        let start = now();
        let kmerObj = this;
        let str = progressEvent({
            time: 100 /* ms */
        });
        let promise = new Promise(function (resolve) {
            // Source: https://strongloop.com/strongblog/practical-examples-of-the-new-node-js-streams-api/
            let liner = new stream.Transform({ objectMode: true });
            liner._transform = function (chunk, encoding, done) {
                let data = chunk.toString();
                if (this._lastLineData) {
                    data = this._lastLineData + data;
                }
                let lines = data.split('\n');
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
            // if (kmerObj.env === 'node'){
            //     fs.createReadStream(kmerObj.fastq).pipe(liner);
            // }else if (kmerObj.env === 'browser') {
            //     fileReaderStream(kmerObj.fastq).pipe(liner);
            // }
            if (kmerObj.env === 'node'){
                fs.createReadStream(kmerObj.fastq).pipe(str).pipe(liner);
            }else if (kmerObj.env === 'browser') {
                fileReaderStream(kmerObj.fastq).pipe(str).pipe(liner);
            }
            let i = 0;
            let lines = 0;
            kmerObj.lines = 0;
            kmerObj.bytesRead = 0;
            kmerObj.linesPerChunk = 0;
            liner.on('readable', function () {
                let line;
                while (null !== (line = liner.read())) {
                    kmerObj.lines  += 1;
                    if (i === 1 && line.length > 1) {
                      [line, complement(line)].forEach(function (kmerLine) {
                            kmerObj.kmersInLine(kmerLine, kmerObj.kmerMap,
                                kmerObj.length,kmerObj.preffix, kmerObj.step);
                        });
                    } else if (i === 3) {
                        i = -1;
                    }
                    i += 1;
                    if (kmerObj.env === 'node' && kmerObj.progress && false){
                        let progress = `L: ${lines} / K: ${kmerObj.kmerMapSize}\r`;
                        process.stdout.write(progress);
                    }
                }
            });
            liner.on('end', function () {
                let end = now();
                kmerObj.kmerExtractTime = end - start;
                // Clean up progress output
                if (kmerObj.env === 'node' && kmerObj.progress){
                    process.stdout.write('\n                               \n');
                }
                resolve(kmerObj.kmerMap);
            });
        });
        return {
            promise: promise,
            event: str
        };
    }
}

module.exports = {
    KmerJS: KmerJS, // (A)
    mapToJSON: mapToJSON,
};
