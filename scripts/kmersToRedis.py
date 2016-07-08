#!/usr/bin/env python

import json
import redis

r = redis.StrictRedis(host='192.168.99.100', port=6379, db=0)
print 'loading data...'
with open('database/jsonindex2.json') as data_file:
    data = json.load(data_file)
print 'data loaded!'
for entry in data:
    if entry['kmer'] != '':
        for template in entry['templates']:
            r.rpush(entry['kmer'], json.dumps(template))
        # try:
        #     r.hmset(entry['kmer'], entry['templates'])
        # except:
        #     print entry['templates']
        #     continue
