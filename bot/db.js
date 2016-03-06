var fs = require('fs');
ServerSettings = require('../db/servers.json');

function updateDB(file, data) {
	fs.writeFile(file, data)
}

function addServer(server) {
	if (!ServerSettings.hasOwnProperty(server.id)) {
		ServerSettings[server.id] = {"ignore":[],"banAlerts":false,"nameChanges":false,"welcome":"none","deleteCommands":false,"notifyChannel":"general","allowNSFW":false};
		updateDB(__dirname + '/../db/servers.json', JSON.stringify(ServerSettings));
	}
}

exports.addServer = function(server) {
	if (!ServerSettings.hasOwnProperty(server.id)) {
		ServerSettings[server.id] = {"ignore":[],"banAlerts":false,"nameChanges":false,"welcome":"none","notifyChannel":"general","allowNSFW":false};
		console.log()
		updateDB(__dirname + '/../db/servers.json', JSON.stringify(ServerSettings));
	}
};
