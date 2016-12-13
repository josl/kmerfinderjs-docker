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

templates_lengths = pickle.load(
    open('bacteria.organisms.ATGAC.len.p', 'rb'))
templates_ulengths = pickle.load(
    open('bacteria.organisms.ATGAC.ulen.p', 'rb'))
template_tot_len = 0
template_tot_ulen = 0
Ntemplates = 0
for name in templates_lengths:
    template_tot_len += templates_lengths[name]
    template_tot_ulen += templates_ulengths[name]
    Ntemplates += 1

with open('bacteria_organism_summary.txt', 'w') as fh:
    fh.write(gen_redis_proto("HMSET", "Summary", "templates", Ntemplates, "totalLen", template_tot_len, "uniqueLens", template_tot_ulen)
