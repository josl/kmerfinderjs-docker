#!/usr/bin/env python
import pickle
import subprocess
from collections import defaultdict
import io
import json
import subprocess

templates = pickle.load(
    open('/kmer-database/complete_genomes.ATGAC.p', 'r'))
templates_lenghts = pickle.load(
    open('/kmer-database/complete_genomes.ATGAC.len.p', 'r'))
templates_ulengths = pickle.load(
    open('/kmer-database/database/complete_genomes.ATGAC.ulen.p', 'r'))
templates_descriptions = pickle.load(
    open('/kmer-database/complete_genomes.ATGAC.desc.p', 'r'))


total_dna = defaultdict(list)
for dna in templates:
    for template in list(set(templates[dna].split(','))):
        total_dna[template].append(dna)

keys = set().union(
    templates_ulengths, templates_descriptions, templates_lenghts, total_dna)
dictionaries = [templates_ulengths,
                templates_descriptions,
                templates_lenghts,
                total_dna]

total = {k: [d.get(k, '') for d in dictionaries] for k in keys}
database = []
for template in total:
    entry = {}
    entry['ulenght'] = total[template][0]
    entry['species'] = total[template][1]
    entry['lengths'] = total[template][2]
    entry['reads'] = total[template][3]
    entry['sequence'] = template
    database.append(entry)
with io.open('/kmer-database/myDB.json', 'w', encoding='utf-8') as f:
    f.write(unicode(json.dumps(database, ensure_ascii=False)))

# System call
retcode = subprocess.call([
    'mongoimport', '-d', 'Kmers', '-c', 'genomes', '-j', '16',
    '--file', '/kmer-database/myDB.json.json', '--jsonArray', '--batchSize=100'
])
