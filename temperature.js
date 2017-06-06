require('dotenv').config();

var request = require('request');
var fs = require('fs');
var express = require('express');
var app = express();
var CronJob = require('cron').CronJob;

var logOutsideTemp = new CronJob({
    cronTime: '*/5 * * * *',
    onTick: function() {
        logOutsideTemperature();
    },
    start: true,
    timeZone: 'Europe/Amsterdam'
});

function logOutsideTemperature() {
    var url = ['https://api.particle.io/v1/devices/',
        process.env.PARTICLE_DEVICE_ID,
        '/temperature?access_token=',
        process.env.PARTICLE_ACCESS_TOKEN].join('');
    request(url, function(error, response, body) {
        if (!error && response.statusCode == 200) {
            var temperatureFloat = JSON.parse(body).result;
            if (parseFloat(temperatureFloat) < -100 || temperatureFloat == "-0.0625" || parseFloat(temperatureFloat) >100) return;
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
