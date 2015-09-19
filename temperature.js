var SerialPort = require("serialport").SerialPort
var fs = require("fs");
var serialPort = new SerialPort("/dev/serial/by-id/usb-Arduino__www.arduino.cc__Arduino_Uno_649363339363515081E1-if00", {
    baudrate: 115200
}, false); // this is the openImmediately flag [default is true]
var express = require('express');
var app = express();

var lastTimeStamp = new Date();

serialPort.open(function (error) {
    if ( error ) {
        console.log('failed to open: '+error);
    } else {
        console.log('now logging temperatures to file');
        serialPort.on('data', function(data) {
            var stringData = '' + data;
            var split = stringData.split(':');
            if (split.length > 0) {
                var temperatureFloat = parseFloat(split[1]);
                if(temperatureFloat) {
                    var now = new Date();
                    if(now - lastTimeStamp > 1000 * 60 * 60) {
                        fs.appendFile('temperatures.txt', new Date().toString()+';'+ temperatureFloat + '\n', function (err) {
                        });
                        console.log(temperatureFloat);
                        lastTimeStamp = now;
                    }
                }
            }
        });
    }
});

app.get('/temperatures', function(req, res) {
    fs.readFile('temperatures.txt', 'utf-8', function (err, data) {
        if (err) throw err;
            var lines = data.trim().split('\n');
            var lastLines = lines.slice(-24);
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

app.get('/current', function(req, res) {
    fs.readFile('temperatures.txt', 'utf-8', function (err, data) {
        if (err) throw err;
            var lines = data.trim().split('\n');
            var lastLine = lines.slice(-1)[0];
            var fields = lastLine.split(';');

            var date = fields[0];
            var temperature = parseFloat(fields[1]);
            res.json({
                date: date,
                temperature: temperature    
            });
    });
});

app.use(express.static('public'));

var server = app.listen(1234, function () {
  var host = server.address().address;
  var port = server.address().port;

  console.log('Temperature webserver listening at http://%s:%s', host, port);
});
