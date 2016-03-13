var fs = require('fs');
var colors = require("./styles.js");
ServerSettings = require('../db/servers.json');

var updated = false;
setInterval(() => {
	if (updated) {
		updated = false;
		updateServers();
	}
}, 30000)

function updateServers() {
	fs.writeFile(__dirname + '/../db/servers-temp.json', JSON.stringify(ServerSettings), error=>{
		if (error) console.log(error)
		else {
			fs.stat(__dirname + '/../db/servers-temp.json', (err, stats)=>{
				if (err) console.log(err)
				else if (stats["size"] < 5) console.log('Prevented server settings database from being overwritten')
				else {
					fs.rename(__dirname + '/../db/servers-temp.json', __dirname + '/../db/servers.json', e=>{if(e)console.log(e)});
					if (debug) console.log(colors.cDebug(" DEBUG ") + " Updated servers.json");
				}
			});
		}
	})
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
