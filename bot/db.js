/* global ServerSettings */
/// <reference path="../typings/main.d.ts" />
var pg = require('pg');
const SERVER_DB_NAME = 'servers';
ServerSettings = {};

exports.sql = function(bot, msg, query) {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
		if (err) { console.log(err);
		} else {
			var q = client.query(query);
			q.on('error', (e) => { bot.sendMessage(msg, '```' + e.message + '```'); return; });
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
			q.on('error', (e) => { console.log(e.message); return; });
			ServerSettings = {};
			q.on('row', (row) => {
				ServerSettings[row.id] = {'deletecmds': row.deletecmds, 'welcomemsg': row.welcomemsg, 'banalerts': row.banalerts, 'namechanges': row.namechanges};
			});
			q.on('end', (result) => {
			});
			done();
		} else { console.log(err); return; }
	});
}

function updateServerDB(sID) { //fix this like exported version
	if (sID && ServerSettings.hasOwnProperty(sID)) {
		pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
			if (!err) {
				var q = client.query('SELECT * FROM ' + SERVER_DB_NAME + ' WHERE id = ' + sID);
				q.on('error', (e) => { console.log(e.message); done(); return false; });
				q.on('end', (result) => {
					var checkData = new Promise((resolve, reject) => {
						if (!result) { reject('No data returned from query') }
						var updateQ = client.query('UPDATE ' + SERVER_DB_NAME + ' SET deletecmds = $1, welcomemsg = $2, banalerts = $3, namechanges = $4 WHERE id = ' + sID, [ServerSettings[sID].deletecmds, ServerSettings[sID].welcomemsg, ServerSettings[sID].banalerts, ServerSettings[sID].namechanges]);
						updateQ.on('error', (e) => { console.log(e.message); done(); return false; });
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

exports.fetchServerDB = function(tableName) {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
		if (!err) {
			var q = client.query('SELECT * FROM ' + tableName);
			q.on('error', (e) => { console.log(e.message); return; });
			ServerSettings = {};
			q.on('row', (row) => {
				ServerSettings[row.id] = {'deletecmds': row.deletecmds, 'welcomemsg': row.welcomemsg, 'banalerts': row.banalerts, 'namechanges': row.namechanges};
			});
			q.on('end', (result) => {
			});
			done();
		} else { console.log(err); return; }
	});
};
exports.updateServerDB = function(sID, callback) {
	if (sID && ServerSettings.hasOwnProperty(sID)) {
		pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
			if (!err) {
				var q = client.query('SELECT * FROM ' + SERVER_DB_NAME + ' WHERE id = ' + sID);
				q.on('error', (e) => { console.log(e.message); done(); return; });
				q.on('end', (result) => {
					if (!result) { console.log('No data returned from query'); return; done(); }
					var updateQ = client.query('UPDATE ' + SERVER_DB_NAME + ' SET deletecmds = $1, welcomemsg = $2, banalerts = $3, namechanges = $4 WHERE id = ' + sID, [ServerSettings[sID].deletecmds, ServerSettings[sID].welcomemsg, ServerSettings[sID].banalerts, ServerSettings[sID].namechanges]);
					updateQ.on('error', (e) => { console.log('Error updating server settings: ' + e.message); done(); return; });
					updateQ.on('end', (result) => { done(); callback(); });
				});
			} else { console.log(err); return; }
		});
	} else { return; }
};
exports.addToDB = function(sID, callback) {
	pg.connect(process.env.DATABASE_URL + '?ssl=true', function(err, client, done) {
		if (!err) {
			var q = client.query('INSERT INTO ' + SERVER_DB_NAME + ' VALUES ($1, $2, $3, $4, $5)', [sID, ServerSettings[sID].deletecmds, ServerSettings[sID].welcomemsg, ServerSettings[sID].banalerts, ServerSettings[sID].namechanges]);
			q.on('error', (e) => { console.log(e.message); done(); return; });
			q.on('end', () => {
				done();
				callback();
			});
		} else { console.log(err); return; }
	});
};
