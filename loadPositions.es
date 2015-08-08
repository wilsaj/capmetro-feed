'use strict';

const es = require('event-stream');
const fs = require('fs');
const GTFS = require('gtfs-realtime-bindings');
const highland = require('highland');
const r = require('rethinkdb');

const argv = require('minimist')(process.argv.slice(2));


const db = {
  connectionOpts: {
    host: 'localhost',
    port: 28015,
    db: 'capmetro'
  },
  tables: {
    locations: 'locations'
  }
};

function entityStream () {
  return es.through(function write(data) {
    let stream = this;
    const feed = GTFS.FeedMessage.decode(data);

    feed.entity.forEach((entity) => {
      stream.emit('data', entity);
    });
  });
}

function processVehicle(vehicle) {
  vehicle.id = vehicle.vehicle.id + '-' + vehicle.timestamp.low;

  const sinceEpoch = vehicle.timestamp.low;
  vehicle.timestamp = r.epochTime(sinceEpoch);

  vehicle.point = r.point(vehicle.position.longitude, vehicle.position.latitude);

  return vehicle;
}

function insertVehicle(conn, vehicle, cb) {
  var vehicleData = processVehicle(vehicle);

  r.table(db.tables.locations).insert(vehicleData).run(conn, (err, data) => {
    if (err) {
      throw err;
    }
    console.log('vehicle inserted: ' + vehicle.id);
    cb(null, data);
  });
}

function load(filepaths) {
  const dbName = db.connectionOpts.db;

  r.connect(db.connectionOpts, (err, conn) => {
    if (err) {
      console.log(err);
    }

    r.dbCreate(dbName).run(conn, (err, data) => {
      if (err) {
        console.log(err);
      }
      conn.use(dbName);

      r.tableCreate(db.tables.locations).run(conn, (err, data) => {
        highland(filepaths).each((filepath) => {
          return fs.createReadStream(filepath)
            .pipe(entityStream())
            .pipe(es.map((entity, cb) => {
              if (entity.vehicle) {
                insertVehicle(conn, entity.vehicle, cb);
              }
            }));
        });
      });
    });
  });
}




if (require.main === module) {
  var filepaths = argv['_'];
  load(filepaths);
}
