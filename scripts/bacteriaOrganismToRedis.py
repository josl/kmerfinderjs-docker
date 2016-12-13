#!/usr/bin/env python
import pickle
import subprocess
from collections import defaultdict
import io
import json
import subprocess
import json
# import redis

# Source: https://gist.github.com/laserson/2689744
def gen_redis_proto(*args):
    proto = ''
    proto += '*' + str(len(args)) + '\r\n'
    for arg in args:
        proto += '$' + str(len(arg)) + '\r\n'
        proto += str(arg) + '\r\n'
    return proto

# r = redis.StrictRedis(host='redis', port=6379, db=2)

templates = pickle.load(
    open('bacteria.organisms.ATGAC.p', 'rb'))
templates_lengths = pickle.load(
    open('bacteria.organisms.ATGAC.len.p', 'rb'))
templates_ulengths = pickle.load(
    open('bacteria.organisms.ATGAC.ulen.p', 'rb'))
templates_descriptions = pickle.load(
    open('bacteria.organisms.ATGAC.desc.p', 'rb'))

with open('bacteria_organism.txt', 'w') as fh:
    for kmer in templates:
        for template in list(set(templates[kmer].split(','))):
            # r.rpush(kmer, json.dumps(template))
            entry = {}
            entry['ulenght'] = templates_ulengths[template]
            entry['species'] = templates_descriptions[template]
            entry['lengths'] = templates_lengths[template]
            entry['sequence'] = template
            fh.write(gen_redis_proto("RPUSH", "%s" % kmer, "%s" % json.dumps(entry)))
