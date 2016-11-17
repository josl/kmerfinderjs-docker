#!/usr/bin/env python

import json
import redis

r = redis.StrictRedis(db=2)
# r = redis.StrictRedis(host='192.168.99.100', port=6379, db=2)
print 'loading data...'
with open('/Users/cisneror/code/genomic-git/kmerjs/test_data/myDB5_redis.json') as data_file:
    data = json.load(data_file)
print 'data loaded!'
for entry in data:
    if entry['kmer'] != '':
        for template in entry['templates']:
            print entry['kmer'], template['sequence']
            r.rpush(entry['kmer'], json.dumps(template))
        # try:
        #     r.hmset(entry['kmer'], entry['templates'])
        # except:
        #     print entry['templates']
        #     continue
