/// <reference path="../typings/main.d.ts" />
var pg = require('pg');
const SERVER_DB_NAME = 'Servers';
var ServerSettings = {};

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
				if (result.rowCount > 0 && result !== undefined) {
					bot.sendMessage(msg, '```\nCommand: ' + result.command + '\n' + JSON.stringify(result.rows) + '```');
				}
			});
			done();
		}
	});
};

function fetchDB(tableName) {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
		if (!err) {
			var q = client.query('SELECT * FROM ' + tableName);
			q.on('error', (e) => { console.log(e); return; });
			q.on('row', (row, result) => {
				result.addRow(row);
			});
			q.on('end', (result) => {
				result.rows.map((data) => {
					ServerSettings = {};
					ServerSettings[data.ID] = {'deleteCmds': data.deleteCmds, 'welcomeMsg': data.welcomeMsg, 'banAlerts': data.banAlerts, 'nameChanges': data.nameChanges};
				});
			});
			done();
		} else { console.log(err); return; }
	});
}

function updateServerDB(sID) {
	if (sID && ServerSettings.hasOwnProperty(sID)) {
		pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
			if (!err) {
				var q = client.query('SELECT * FROM ' + SERVER_DB_NAME + ' WHERE ID = ' + sID);
				q.on('error', (e) => { console.log(e); done(); return false; });
				q.on('end', (result) => {
					var checkData = new Promise((resolve, reject) => {
						if (!result) { reject('No data returned from query') }
						var updateQ = client.query('UPDATE ' + SERVER_DB_NAME + ' SET DeleteCmds = $1,     !\!!\Th\E \Re\St o\F T\hE\m!\!!     WHERE ID = ' + sID, [ServerSettings[sID].DeleteCmds]);
						updateQ.on('error', (e) => { console.log(e); done(); return false; });
						updateQ.on('end', (result) => { done(); resolve(); });
					});
					checkData.then(() => {
						done();
						return true;
					}).catch((er) => {
						done();
						console.log('Error updating server settings: ' + er);
						return false;
					});
				});
			} else { console.log(err); return false; }
		});
	} else { return false; }
}

fetchDB(SERVER_DB_NAME);
exports.fetchServerDB = fetchDB(SERVER_DB_NAME);
exports.updateServerDB = updateServerDB();
