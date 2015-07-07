.PHONY: data

all: data

clean:
	rm -rf data/*

data: data/locations/2015-04-19


data/%.tgz:
	mkdir -p $(dir $@)
	curl 'https://s3.amazonaws.com/capmetro-feed/$@' -o $@.download
	mv $@.download $@


data/locations/%: data/locations/%.tgz
	mkdir -p $(dir $@)
	tar -xvf $< -C $(dir $@)


load:
	babel-node ./loadPositions.es 'data/locations/2015-04-19/capmetro-realtime-2015-04-19-12:03:01.pbf'
