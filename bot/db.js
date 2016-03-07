var fs = require('fs');
ServerSettings = require('../db/servers.json');

var updated = false;
setInterval(() => {
	if (updated) {
		updated = false;
		updateDB(__dirname + '/../db/servers.json', JSON.stringify(ServerSettings));
	}
}, 30000)

function updateDB(file, data) {
	fs.writeFile(file, data)
}

function addServer(server) {
	if (!ServerSettings.hasOwnProperty(server.id)) {
		ServerSettings[server.id] = {"ignore":[],"banAlerts":false,"nameChanges":false,"welcome":"none","deleteCommands":false,"notifyChannel":"general","allowNSFW":false};
		updated = true;
	}
}

exports.addServer = function(server) {
	if (!ServerSettings.hasOwnProperty(server.id)) {
		ServerSettings[server.id] = {"ignore":[],"banAlerts":false,"nameChanges":false,"welcome":"none","deleteCommands":false,"notifyChannel":"general","allowNSFW":false};
		updated = true;
	}
};

exports.changeSetting = function(key, value, serverId) {
	if (!key || value == undefined || value == null || !serverId) return;
	if (key == 'banAlerts') ServerSettings[serverId].banAlerts = value;
	if (key == 'nameChanges') ServerSettings[serverId].nameChanges = value;
	if (key == 'deleteCommands') ServerSettings[serverId].deleteCommands = value;
	if (key == 'notifyChannel') ServerSettings[serverId].notifyChannel = value;
	if (key == 'allowNSFW') ServerSettings[serverId].allowNSFW = value;
	if (key == 'welcome') ServerSettings[serverId].welcome = value;
	updated = true;
};

exports.ignoreChannel = function(channelId, serverId) {
	if (!channelId || !serverId) return;
	if (ServerSettings[serverId].ignore.indexOf(channelId) == -1) {
		ServerSettings[serverId].ignore.push(channelId);
		updated = true;
	}
}

exports.unignoreChannel = function(channelId, serverId) {
	if (!channelId || !serverId) return;
	if (ServerSettings[serverId].ignore.indexOf(channelId) > -1) {
		ServerSettings[serverId].ignore.splice(ServerSettings[serverId].ignore.indexOf(channelId), 1);
		updated = true;
	}
}
