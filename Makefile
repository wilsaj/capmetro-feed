LOCATION_TGZS_REMOTE:=$(shell aws s3 ls --recursive s3://capmetro-feed/data/locations | awk '{print $$4}')
LOCATION_TGZS:=$(patsubst data/%,tgz/%,$(LOCATION_TGZS_REMOTE))
LOCATION_PBFS:=$(patsubst tgz/%.tgz,pbf/%,$(LOCATION_TGZS))

.PHONY: clean data pbf tgz load-%


all: data

clean:
	rm -rf pbf/*
	rm -rf tgz/*


pbf: $(LOCATION_PBFS:%=%/.mark)

pbf/%/.mark: tgz/%.tgz
	mkdir -p $(dir $@)
	tar -xvf $< --strip-components=3 -C $(dir $@)
	touch $@



tgz: $(LOCATION_TGZS)

tgz/%.tgz:
	mkdir -p $(dir $@)
	curl 'https://s3.amazonaws.com/capmetro-feed/$(patsubst tgz/%,data/%,$@)' -o $@.download
	mv $@.download $@



load-%: pbf/locations/%/.loaded
	echo $@


pbf/locations/%/.loaded: pbf/locations/%/.mark
	babel-node ./loadPositions.es $(wildcard $(dir $<)*.pbf)
	touch $@
