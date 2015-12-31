/*
==========
This is a "ping-pong bot" / music bot.
Run this with node to run the bot.
==========
*/

var discord = require("discord.js");
var commands = require("./bot/commands.js").commands;
var mod = require("./bot/mod.js").commands;
var config = require("./bot/config.json");
var games = require("./bot/games.json").games;
var perms = require("./bot/permissions.json");
var versioncheck = require("./bot/versioncheck.js");
var fs = require("fs");
var chatlog = require("./bot/logger.js").ChatLog;
var logger = require("./bot/logger.js").Logger;

var servers = getServers();
var lastExecTime = {};

var bot = new discord.Client();
bot.on('warn', (m) => logger.log("warn", m));
bot.on('debug', (m) => logger.log("debug", m));

bot.on("ready", function () {
	checkServers();
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
	logger.log("info", "BrussellBot is ready! Listening to " + bot.channels.length + " channels on " + bot.servers.length + " servers");
	versioncheck.checkForUpdate(function (resp) {
		if (resp != null) {
			logger.log("info", resp);
		}
	});
});

bot.on("disconnected", function () {
	logger.log("info", "Disconnected");
	process.exit(1);
});

bot.on("message", function (msg) {
	if (!msg.channel.isPrivate) {
		if (config.log_messages && servers[msg.channel.server.id].log_messages == 1) {
			var d = new Date();
			var mtext = msg.content.replace(/\r?\n|\r/g, " ");
			chatlog.info(d.toUTCString() + ": " + msg.channel.server.name + " --> " + msg.channel.name + " -> " + msg.author.username + " said " + mtext);
		}
	}
	var isCmd = false; //temp fix
	if (msg.content[0] == config.command_prefix) { isCmd = true; }
	if (msg.content[0] == config.mod_command_prefix) { isCmd = true; }
	if (isCmd == false) { return; }
	logger.log("info", "" + msg.author.username + " executed: " + msg.content);
	if (msg.author.id == bot.user.id) { return; }
	var cmd = msg.content.split(" ")[0].substring(1).toLowerCase();
	var suffix = msg.content.substring( cmd.length + 2 );
	if (msg.content.startsWith(config.command_prefix)) {
		var permLvl = 0;
		if (perms.hasOwnProperty(msg.author.id)) { permLvl = perms[msg.author.id].level; }
		if (commands.hasOwnProperty(cmd)) {
			try {
				if (commands[cmd].hasOwnProperty("cooldown")) {
					if (lastExecTime.hasOwnProperty(cmd)) {
						var cTime = new Date();
						var leTime = new Date(lastExecTime[cmd]);
						leTime.setSeconds(leTime.getSeconds() + commands[cmd].cooldown);
						if (cTime < leTime) {
							var left = (leTime - cTime) / 1000;
							bot.sendMessage(msg, "This command is on cooldown with " + Math.round(left) + " seconds remaining");
							return;
						} else { lastExecTime[cmd] = cTime; }
					} else { lastExecTime[cmd] = new Date(); }
				}
				if (commands[cmd].hasOwnProperty("permLevel")) {
					if (commands[cmd].permLevel <= permLvl) { commands[cmd].process(bot, msg, suffix); logger.log("debug", "Command processed: " + cmd); }
					else {
						bot.sendMessage(msg, "You need permission level " + commands[cmd].permLevel + " to do that.");
						logger.log("info", "Insufficient permissions");
					}
				} else { commands[cmd].process(bot, msg, suffix); logger.log("debug", "Command processed: " + cmd); }
			} catch (err) {
				logger.log("error", err);
			}
		}
	} else if (msg.content.startsWith(config.mod_command_prefix)) {
		if (cmd == "reload") {
			if (perms.hasOwnProperty(msg.author.id)) {
				if (perms[msg.author.id].level >= 1) { reload(); }
			}
		}
		if (mod.hasOwnProperty(cmd)) {
			try {
				if (mod[cmd].hasOwnProperty("cooldown")) {
					if (lastExecTime.hasOwnProperty(cmd)) {
						var cTime = new Date();
						var leTime = new Date(lastExecTime[cmd]);
						leTime.setSeconds(leTime.getSeconds() + mod[cmd].cooldown);
						if (cTime < leTime) {
							var left = (leTime - cTime) / 1000;
							bot.sendMessage(msg, "This command is on cooldown with " + Math.round(left) + " seconds remaining");
							return;
						} else { lastExecTime[cmd] = cTime; }
					} else { lastExecTime[cmd] = new Date(); }
				}
				mod[cmd].process(bot, msg, suffix);
				logger.log("debug", "Command processed: " + cmd);
			} catch (err) {
				logger.log("error", err);
				mod[cmd].process(bot, msg, suffix); //might be a bad idea
			}
		}
	}
});

//event listeners
bot.on('serverNewMember', function (objServer, objUser) {
	if (servers[objServer.id].username_change == 1) {
		logger.log("info", "New member on " + objServer.name + ": " + objUser.username);
		bot.sendMessage(objServer.defaultChannel, "Welcome to " + objServer.name + " " + objUser.username);
	}
});

bot.on('serverUpdated', function (objServer, objNewServer) {
	if (config.non_essential_event_listeners) {
		logger.log("debug", "" + objServer.name + " is now " + objNewServer.name);
	}
});

bot.on('channelCreated', function (objChannel) {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate){
			logger.log("debug", "New channel created. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name);
		}
	}
});

bot.on('channelDeleted', function (objChannel) {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) {
			logger.log("debug", "Channel deleted. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name);
		}
	}
});

bot.on('channelUpdated', function (objChannel) { //You could make this find the new channel by id to get new info
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) {
			if (objChannel.type == "text") {
				logger.log("debug", "Channel updated. Was: Type: Text. Name: " + objChannel.name + ". Topic: " + objChannel.topic);
			} else {
				logger.log("debug", "Channel updated. Was: Type: Voice. Name: " + objChannel.name + ".");
			}
		}
	}
});

bot.on('userBanned', function (objUser, objServer) {
	if (servers[objServer.id].ban_message == 1) {
		logger.log("info", "" + objUser.username + " banned on " + objServer.name);
		bot.sendMessage(objServer.defaultChannel, "" + objUser.username + " was banned");
		bot.sendMessage(objUser, "You were banned from " + objServer.name);
	}
});

bot.on('userUnbanned', function (objUser, objServer) {
	if (config.non_essential_event_listeners) {
		logger.log("info", "" + objUser.username + " unbanned on " + objServer.name);
	}
});

bot.on('userUpdated', function (objUser, objNewUser) {
    if (objUser.username != objNewUser.username){
		logger.log("info", "" + objUser.username + " changed their name to " + objNewUser.username);
		bot.servers.forEach(function(ser){
			if (ser.members.get('id', objUser.id) != null && servers[ser.id].username_change == 1){
				bot.sendMessage(ser, "User in this server: `" + objUser.username + "`. changed their name to: `" + objNewUser.username + "`.");
			}
		});
    }
    //if (config.non_essential_event_listeners) {
    //	if (objUser.avatarURL != objNewUser.avatarURL) {
    //		logger.log("info", "" + objNewUser.username + " changed their avatar to: " + objNewUser.avatarUrl);
    //	}
    //}
});

bot.on('presence', function(user, status, game) {
	if (config.log_presence) {
		logger.log("debug", "Presence: " + user.username + " is now " + status + " playing " + game);
	}
});

bot.on('serverCreated', function (objServer) {
	addServer(objServer);
});

//login
bot.login(config.email, config.password);
logger.log("info", "Logging in...");

function updateServers() {
	fs.writeFile("./bot/servers.json", JSON.stringify(servers, null, '\t'), null);
	servers = getServers();
	logger.log("info", "Updated servers.json");
}

function getServers() {
	var svrs = require("./bot/servers.json");
	return svrs;
}

function addServer(svr) {
	var log_m = 1;
	if (svr.members.length < 101) { var user_c = 1; var s_g = 1; }
	else { var user_c = 0; var s_g = 0; }
	if (svr.members.length < 301) { var ban_m = 1; }
	else { var ban_m = 0; }
	var setngs = {
		"log_messages": log_m,
		"username_change": user_c,
		"server_greeting": s_g,
		"ban_message": ban_m
	}
	servers[svr.id] = setngs;
	updateServers();
}

function checkServers() {
	bot.servers.forEach(function (ser) {
		if (servers.hasOwnProperty(ser.id)) {
			//found server in config
		} else {
			logger.log("debug", "Found new server");
			addServer(ser);
		}
	});
}

function reload() {
	delete require.cache[require.resolve('./bot/commands.js')];
	commands = require("./bot/commands.js").commands;
	delete require.cache[require.resolve('./bot/mod.js')];
	mod = require("./bot/mod.js").commands;
	delete require.cache[require.resolve('./bot/config.json')];
	config = require("./bot/config.json");
	delete require.cache[require.resolve('./bot/games.json')];
	games = require("./bot/games.json").games;
	delete require.cache[require.resolve('./bot/permissions.json')];
	perms = require("./bot/permissions.json");
	delete require.cache[require.resolve('./bot/versioncheck.js')];
	versioncheck = require("./bot/versioncheck.js");
	delete require.cache[require.resolve('./bot/logger.js')];
	chatlog = require("./bot/logger.js").ChatLog;
	logger = require("./bot/logger.js").Logger;
	servers = getServers();
	logger.debug("Reloaded modules");
}
