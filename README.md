> Finds kmers in a fastq file

## Install


## Usage

To create the compiled front-end :
```bash
grunt build
```


# Innit DB

http://stackoverflow.com/questions/33475505/mongodb-mongoimport-loses-connection-when-importing-big-files
Innitialize MongoDB assuming that we have mounted a folder on the host machine mapped to /kmer-database in the container with a file named myDB.json

docker exec <CONTAINER_NAME> mongoimport --host 0.0.0.0:27017 -j 16 -d Kmers -c genomes --file /kmer-database/myDB.json --jsonArray --batchSize=100
```bash
# Example
docker exec -ti kmerjsdocker_mongo_1 mongoimport --host 0.0.0.0:27017 -j 16 -d Kmers -c genomes --file /kmer-database/myDB.json --jsonArray --batchSize=100
```

Alternatively, we can include the following files in the database folder on the host machine (that has been mapped to /kmer-database in the container):

/kmer-database/complete_genomes.ATGAC.p
/kmer-database/complete_genomes.ATGAC.len.p
/kmer-database/database/complete_genomes.ATGAC.ulen.p
/kmer-database/complete_genomes.ATGAC.desc.p

and run:

```bash
# Example
docker exec <CONTAINER_NAME> python /src/kmerPyToMongo.py
```

Finally we need to include the Summary collection to the DB
```bash
# Example
docker exec <CONTAINER_NAME> mongoimport --host 0.0.0.0:27017 -j 16 -d Kmers -c Summary --file /kmer-database/summary.json --jsonArray --batchSize=100
```

Useful commands
======================
```bash
# Go to Docker repository
cd /your/path/to/cge-tools-docker

# Update Docker repository
git stash;git pull

# Go to master git branch
git stash;git checkout master

# Shutdown Docker deamon
docker-machine stop default

# Start Docker deamon
docker-machine start default

# Reset Docker env (Used to run docker containers from different terminals)
eval "$(docker-machine env default)"

# Docker Cleanup
# Stop and remove all containers (instances of images)
docker rm $(docker stop $(docker ps -aq))
# Remove all dangling images
docker rmi $(docker images -qf "dangling=true")
```

## License
Apache-2.0 © [Jose Luis Bellod Cisneros](http://josl.github.io)
