/// <reference path="../typings/main.d.ts" />
var pg = require('pg');

exports.sql = function(bot, msg, query) {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
		if (err) { console.log(err);
		} else {
			var q = client.query(query);
			q.on('error', (e) => { bot.sendMessage(msg, '```' + e + '```'); return; });
			q.on('row', (row, result) => {
				result.addRow(row);
			});
			q.on('end', (result) => {
				if (result.rowCount > 0 && result != undefined) {
					bot.sendMessage(msg, '```\nCommand: ' + result.command + '\n' + JSON.stringify(result.rows) + '```');
				}
			});
			done();
		}
	});
};

exports.fetchDB = function() {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
		if (!err) {
			var q = client.query('SELECT * FROM Servers');
			q.on('error', (e) => { console.log(e); return; });
			q.on('row', (row, result) => {
				result.addRow(row);
			});
			q.on('end', (result) => {
				return result.rows;
			});
			done();
		} else { console.log(err); return; }
	});
}
