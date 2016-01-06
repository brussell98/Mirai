/*
This is a multipurpose bot
Run this with node to run the bot.

invite regex: /https?:\/\/discord\.gg\/[A-Za-z0-9]+/
//===================================================*/

var discord = require("discord.js");
var commands = require("./bot/commands.js").commands;
var mod = require("./bot/mod.js").commands;
var config = require("./bot/config.json");
var games = require("./bot/games.json").games;
var versioncheck = require("./bot/versioncheck.js");
var fs = require("fs");
var logger = require("./bot/logger.js").Logger;
var cleverbot = require("./bot/cleverbot").cleverbot;

if (config.is_heroku_version) {
	var express = require('express');
	var app = express();
	//For avoidong Heroku $PORT error
	app.set('port', (process.env.PORT || 5000));
	app.get('/', function(request, response) {
		var result = 'Bot is running'
		response.send(result);
	}).listen(app.get('port'), function() {
		console.log('Bot is running, server is listening on port', app.get('port'));
	});
}

var lastExecTime = {};
var shouldCarbonAnnounce = true;

var bot = new discord.Client();
bot.on('warn', function (m) {
	try { logger.log("warn", m) }
	catch(err) { logger.log("error", err) }});
bot.on('debug', (m) => logger.log("debug", m));

bot.on("ready", function () {
	//bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
	bot.setPlayingGame("]help [command]");
	logger.log("info", "BrussellBot is ready! Listening to " + bot.channels.length + " channels on " + bot.servers.length + " servers");
	versioncheck.checkForUpdate(function (resp) {
		if (resp != null) {
			logger.log("info", resp);
		}
	});
});

bot.on("disconnected", function () {
	logger.log("info", "Disconnected");
	(config.is_heroku_version) ? process.exit(0) : process.exit(1);
});

bot.on("message", function (msg) {
	if (msg.channel.isPrivate && /https?:\/\/discord\.gg\/[A-Za-z0-9]+/.test(msg.content)) { carbonInvite(msg); }
	if (msg.mentions.length != 0) {
		msg.mentions.forEach(function(usr) { 
			if (usr.id == bot.user.id && msg.content.startsWith("<@125367104336691200>")) { cleverbot(bot, msg); logger.log("info", msg.author.username+" asked cleverbot "+msg.content) }
		});
	}
	if (msg.content[0] != config.command_prefix && msg.content[0] != config.mod_command_prefix) { return; }
	logger.log("info", "" + msg.author.username + " executed: " + msg.content);
	if (msg.author.id == bot.user.id) { return; }
	var cmd = msg.content.split(" ")[0].substring(1).toLowerCase();
	var suffix = msg.content.substring( cmd.length + 2 );
	if (msg.content.startsWith(config.command_prefix)) {
		if (commands.hasOwnProperty(cmd)) {
			try {
				if (commands[cmd].hasOwnProperty("cooldown")) {
					if (lastExecTime.hasOwnProperty(cmd)) {
						var cTime = new Date();
						var leTime = new Date(lastExecTime[cmd]);
						leTime.setSeconds(leTime.getSeconds() + commands[cmd].cooldown);
						if (cTime < leTime) {
							var left = (leTime - cTime) / 1000;
							if (msg.author.id != config.admin_id) {
								bot.sendMessage(msg, "This command is on cooldown with " + Math.round(left) + " seconds remaining");
								return;
							}
						} else { lastExecTime[cmd] = cTime; }
					} else { lastExecTime[cmd] = new Date(); }
				}
				commands[cmd].process(bot, msg, suffix);
				if (commands[cmd].hasOwnProperty("deleteCommand")) {
					if (commands[cmd].deleteCommand == true) { bot.deleteMessage(msg, {"wait": 2000}); }
				}
				logger.log("debug", "Command processed: " + cmd);
			} catch (err) {
				logger.log("error", err);
			}
		}
	} else if (msg.content.startsWith(config.mod_command_prefix)) {
		if (cmd == "reload") { reload(); return; }
		if (mod.hasOwnProperty(cmd)) {
			try {
				if (mod[cmd].hasOwnProperty("cooldown")) {
					if (lastExecTime.hasOwnProperty(cmd)) {
						var cTime = new Date();
						var leTime = new Date(lastExecTime[cmd]);
						leTime.setSeconds(leTime.getSeconds() + mod[cmd].cooldown);
						if (cTime < leTime) {
							var left = (leTime - cTime) / 1000;
							if (msg.author.id != config.admin_id) {
								bot.sendMessage(msg, "This command is on cooldown with " + Math.round(left) + " seconds remaining");
								return;
							}
						} else { lastExecTime[cmd] = cTime; }
					} else { lastExecTime[cmd] = new Date(); }
				}
				mod[cmd].process(bot, msg, suffix);
				if (mod[cmd].hasOwnProperty("deleteCommand")) {
					if (mod[cmd].deleteCommand == true) { bot.deleteMessage(msg, {"wait": 2000}); }
				}
				logger.log("debug", "Command processed: " + cmd);
			} catch (err) {
				logger.log("error", err);
			}
		}
	}
});

//event listeners
bot.on('serverNewMember', function (objServer, objUser) {
	if (objServer.members.length < 71 && config.non_essential_event_listeners) {
		logger.log("info", "New member on " + objServer.name + ": " + objUser.username);
		if (config.greet_new_memebrs) {
			bot.sendMessage(objServer.defaultChannel, "Welcome to " + objServer.name + " " + objUser.username);
		}
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
	if (objServer.members.length < 301 && config.non_essential_event_listeners) {
		logger.log("info", "" + objUser.username + " banned on " + objServer.name);
		bot.sendMessage(objServer.defaultChannel, "" + objUser.username + " was banned");
		bot.sendMessage(objUser, "You were banned from " + objServer.name);
	}
});

bot.on('userUnbanned', function (objUser, objServer) {
	if (objServer.members.length < 301 && config.non_essential_event_listeners) {
		logger.log("info", "" + objUser.username + " unbanned on " + objServer.name);
	}
});

bot.on('userUpdated', function (objUser, objNewUser) {
	if (config.non_essential_event_listeners) {
		if (objUser.username != objNewUser.username){
			//logger.log("info", "" + objUser.username + " changed their name to " + objNewUser.username);
			if (config.username_changes) {
				bot.servers.forEach(function(ser){
					if (ser.members.get('id', objUser.id) != null && ser.members.length < 101){
						bot.sendMessage(ser, "User in this server: `" + objUser.username + "`. changed their name to: `" + objNewUser.username + "`.");
					}
				});
			}
		}
	}
});

bot.on('presence', function(user, status, game) {
	if (config.log_presence) {
		logger.log("debug", "Presence: " + user.username + " is now " + status + " playing " + game);
	}
});

bot.on('serverDeleted', function(objServer) {
	logger.log("info", "Left server "+objServer.name)
});

//login
try {
	logger.log("info", "Logging in...");
	if (config.is_heroku_version) { bot.login(process.env.email, process.env.password); } else { bot.login(config.email, config.password); }
} catch(err) { if (config.is_heroku_version) { logger.log("error", err); process.exit(0); } else { logger.log("error", err); process.exit(1); }}

function carbonInvite(msg){
	if (msg) {
		bot.joinServer(msg.content, function (err, server) {
			if (err) {
				bot.sendMessage(msg, "Failed to join: " + err);
				logger.log("warn", err);
			} else {
				logger.log("info", "Joined server: " + server);
				bot.sendMessage(msg, "Successfully joined ***" + server + "***");
				if (shouldCarbonAnnounce) {
					var msgArray = [];
					msgArray.push("Hi! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author + ".");
					msgArray.push("You can use `" + config.command_prefix + "help` to see what I can do. Mods can use `"+config.mod_command_prefix+"help` for mod commands.");
					msgArray.push("If I shouldn't be here someone with the `Kick Members` permission can use `" + config.mod_command_prefix + "leaves` to make me leave");
					bot.sendMessage(server.defaultChannel, msgArray);
				}
			}
		});
	}
}

function reload() {
	delete require.cache[require.resolve('./bot/config.json')];
	config = require("./bot/config.json");
	delete require.cache[require.resolve('./bot/games.json')];
	games = require("./bot/games.json").games;
	delete require.cache[require.resolve('./bot/commands.js')];
	try { commands = require("./bot/commands.js").commands;
	} catch(err) {  }
	delete require.cache[require.resolve('./bot/mod.js')];
	try {mod = require("./bot/mod.js").commands;
	} catch(err) {  }
	delete require.cache[require.resolve('./bot/config.json')];
	delete require.cache[require.resolve('./bot/versioncheck.js')];
	versioncheck = require("./bot/versioncheck.js");
	delete require.cache[require.resolve('./bot/logger.js')];
	logger = require("./bot/logger.js").Logger;
	logger.info("Reloaded modules with no errors");
}

if (config.is_heroku_version) {
	var http = require("http");
	setInterval(function() {
		http.get("http://sheltered-river-1376.herokuapp.com"); //your url here
	}, 1200000);
}
