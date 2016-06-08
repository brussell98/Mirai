var config = require("../bot/config.json"),
	utils = require('../utils/utils.js');

ServerSettings = require('../db/servers.json');
Times = require('../db/times.json');
var inactive = [];

var updatedS = false, updatedT = false;
setInterval(() => {
	if (updatedS) {
		updatedS = false;
		utils.safeSave('db/servers', '.json', JSON.stringify(ServerSettings));
	}
	if (updatedT) {
		updatedT = false;
		utils.safeSave('db/times', '.json', JSON.stringify(Times));
	}
}, 60000);

exports.serverIsNew = function(server) {
	return !Times.hasOwnProperty(server.id);
}

exports.changeSetting = function(key, value, serverId) {
	if (!key || value == undefined || value == null || !serverId) return;
	switch (key) {
		case 'banAlerts':
			ServerSettings[serverId].banAlerts = value; break;
		case 'nameChanges':
			ServerSettings[serverId].nameChanges = value; break;
		case 'deleteCommands':
			ServerSettings[serverId].deleteCommands = value; break;
		case 'notifyChannel':
			ServerSettings[serverId].notifyChannel = value; break;
		case 'allowNSFW':
			ServerSettings[serverId].allowNSFW = value; break;
		case 'welcome':
			ServerSettings[serverId].welcome = value; break;
	}
	updatedS = true;
};

exports.ignoreChannel = function(channelId, serverId) {
	if (!channelId || !serverId) return;
	if (!ServerSettings[serverId].ignore.includes(channelId)) {
		ServerSettings[serverId].ignore.push(channelId);
		updatedS = true;
	}
};

exports.unignoreChannel = function(channelId, serverId) {
	if (!channelId || !serverId) return;
	if (ServerSettings[serverId].ignore.includes(channelId)) {
		ServerSettings[serverId].ignore.splice(ServerSettings[serverId].ignore.indexOf(channelId), 1);
		updatedS = true;
	}
};

exports.checkServers = function(bot) {
	inactive = [];
	let now = Date.now();
	Object.keys(Times).map(id => {
		if (!bot.servers.find(s => s.id == id)) delete Times[id];
	});
	bot.servers.map(server => {
		if (server == undefined) return;
		if (!Times.hasOwnProperty(server.id)) {
			console.log(cGreen("Joined server: ") + server.name);
			if (config.banned_server_ids && config.banned_server_ids.includes(server.id)) {
				console.log(cRed("Joined server but it was on the ban list") + ": " + server.name);
				bot.sendMessage(server.defaultChannel, "This server is on the ban list");
				setTimeout(() => {bot.leaveServer(server);}, 1000);
			} else {
				if (!config.whitelist.includes(server.id)) {
					bot.sendMessage(server.defaultChannel, `👋🏻 Hi! I'm **${bot.user.username.replace(/@/g, '@\u200b')}**\nYou can use **\`${config.command_prefix}help\`** to see what I can do.\nMod/Admin commands *including bot settings* can be viewed with **\`${config.mod_command_prefix}help\`**\nFor help, feedback, bugs, info, changelogs, etc. go to **<https://discord.gg/0kvLlwb7slG3XCCQ>**`);
				}
				Times[server.id] = now;
			}
		} else if (!config.whitelist.includes(server.id) && now - Times[server.id] >= 604800000) {
			inactive.push(server.id);
			if (debug) console.log(`${cDebug(" DEBUG ")} ${server.name} (${server.id}) hasn't used the bot for ${((now - Times[server.id]) / 1000 / 60 / 60 / 24).toFixed(1)} days.`);
		}
	});
	updatedT = true;
	if (inactive.length > 0) console.log("Can leave " + inactive.length + " servers that don't use the bot");
	if (debug) console.log(cDebug(" DEBUG ") + " Checked for inactive servers");
};

exports.remInactive = function(bot, msg, delay = 6000) {
	if (!bot || !msg) return;
	if (inactive.length == 0) {
		bot.sendMessage(msg, 'Nothing to leave :)');
		return;
	}
	let cnt = 0, passedOver = 0, toSend = "__Left servers for inactivity:__", now1 = new Date();
	let remInterval = setInterval(() => {
		let server = bot.servers.get('id', inactive[passedOver]);
		if (server) {
			toSend += `\n**${cnt+1}:** ${server.name.replace(/@/g, '@\u200b')} (${((now1 - Times[inactive[passedOver]]) / 1000 / 60 / 60 / 24).toFixed(1)} days)`;
			server.leave();
			console.log(cUYellow("Left server") + " " + server.name);
			if (Times.hasOwnProperty(server.id)) {
				delete Times[server.id];
				updatedT = true;
				if (debug) console.log(cDebug(" DEBUG ") + " Removed server from times.json");
			}
			cnt++;
		}
		delete Times[inactive[passedOver]];
		passedOver++;
		if (cnt >= 10 || passedOver >= inactive.length) {
			for (let i = 0; i < passedOver; i++) inactive.shift(); //remove the servers that it left from the array
			if (cnt == 0)
				bot.sendMessage(msg, 'Nothing to leave :)');
			else bot.sendMessage(msg, toSend);
			clearInterval(remInterval);
			updatedT = true;
			return;
		}
	}, delay);
};

exports.handleLeave = function(server) {
	if (!server || !server.id) return;
	if (Times.hasOwnProperty(server.id)) {
		delete Times[server.id];
		updatedT = true;
		if (debug) console.log(cDebug(" DEBUG ") + " Removed server from times.json");
	}
};

exports.addServerToTimes = function(server) {
	if (!server || !server.id) return;
	if (!Times.hasOwnProperty(server.id)) {
		Times[server.id] = Date.now();
		updatedT = true;
	}
};

var addServer = function(server) {
	if (!server) return
	if (!ServerSettings.hasOwnProperty(server.id)) {
		ServerSettings[server.id] = {"ignore":[], "banAlerts":false, "nameChanges":false, "welcome":"none", "deleteCommands":false, "notifyChannel":"general", "allowNSFW":false};
		updatedS = true;
	}
}

exports.addServer = addServer;

exports.updateTimestamp = function(server) {
	if (!server || !server.id) return;
	if (Times.hasOwnProperty(server.id)) {
		Times[server.id] = Date.now();
		updatedT = true;
	}
	if (inactive.includes(server.id)) inactive.splice(inactive.indexOf(server.id), 1); //if server was marked for removal remove that entry
};
