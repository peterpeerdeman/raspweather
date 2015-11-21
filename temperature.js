var serialport = require('serialport');
var SerialPort = require('serialport').SerialPort
var request = require('request');
var fs = require('fs');
var serialPort = new SerialPort('/dev/serial/by-id/usb-Arduino__www.arduino.cc__Arduino_Uno_649363339363515081E1-if00', {
    baudrate: 115200,
    parser: serialport.parsers.readline('\n')
}, false); // this is the openImmediately flag [default is true]
var express = require('express');
var app = express();

var lastTimeStamp = new Date();

var PARTICLE_DEVICE_ID = '';
var PARTICLE_ACCESS_TOKEN = '';

serialPort.open(function(error) {
    if (error) {
        console.log('failed to open: ' + error);
    } else {
        console.log('now logging temperatures to file');
        serialPort.on('data', function(data) {
            var stringData = data.toString();
            var split = stringData.split(':');
            if (split.length > 0) {
                var temperatureFloat = parseFloat(split[1]);
                if (temperatureFloat) {
                    var now = new Date();
                    if (now - lastTimeStamp > 1000 * 60 * 60) {
                        var logEntry = new Date().toString() + ';' + temperatureFloat + '\n';
                        fs.appendFile('temperatures.txt', logEntry, function(err) {
                            //
                        });
                        logOutsideTemperature();
                        console.log(temperatureFloat);
                        lastTimeStamp = now;
                    }
                }
            }
        });
    }
});

function logOutsideTemperature() {
    var url = ['https://api.particle.io/v1/devices/',
        PARTICLE_DEVICE_ID,
        '/temperature?access_token=',
        PARTICLE_ACCESS_TOKEN].join('');
    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var temperatureFloat = JSON.parse(body).result;
            if (temperatureFloat == "-0.0625" || parseFloat(temperatureFloat) >100) return;
            var logEntry = new Date().toString() + ';' + temperatureFloat + '\n';
            fs.appendFile('temperatures-outside.txt', logEntry, function(err) {
                //
            });
        }
    });
}

/* Get temperatures
 * @param limit number of temperatures, max 24*7
 */
app.get('/temperatures', function(req, res) {
    var limit = 24;
    var filename = 'temperatures.txt';
    if (req.query.limit && parseInt(req.query.limit)) {
        limit = Math.min(parseInt(req.query.limit), 24 * 7);
    }
    if (req.query.location == 'outside') {
        filename = 'temperatures-outside.txt';
    }

    fs.readFile(filename, 'utf-8', function(err, data) {
        if (err) throw err;
        var lines = data.trim().split('\n');
        var lastLines = lines.slice(-1 * Math.abs(limit));
        var result = lastLines.map(function(line) {

            var fields = line.split(';');

            var date = fields[0];
            var temperature = parseFloat(fields[1]);
            return {
                date: date,
                temperature: temperature
            };
        });

        res.json(result);
    });
});

app.use(express.static('public'));

var server = app.listen(1234, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Temperature webserver listening at http://%s:%s', host, port);
});
