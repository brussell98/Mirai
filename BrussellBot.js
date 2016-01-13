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
checkConfig(); //notify user if they are missing things in the config

if (config.is_heroku_version) { //For avoiding Heroku $PORT error
	var express = require('express');
	var app = express();
	app.set('port', (process.env.PORT || 5000));
	app.get('/', function(request, response) {
		var result = 'Bot is running';
		response.send(result);
	}).listen(app.get('port'), function() {
		console.log('Bot is running, server is listening on port', app.get('port'));
	});
}

var lastExecTime = {}; //for cooldown
var shouldCarbonAnnounce = true; //set if the bot should announce when joining an invite sent without a command

var bot = new discord.Client();
bot.on('warn', function (m) { logger.log("warn", m); });
bot.on('debug', function(m) { logger.log("debug", m); });

bot.on("ready", function () {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]); //set game to a random game from games.json
	//bot.setPlayingGame("]help [command]");
	logger.log("info", "BrussellBot is ready! Listening to " + bot.channels.length + " channels on " + bot.servers.length + " servers");
	logger.log("info", "Username: "+bot.user.username);
	versioncheck.checkForUpdate(function (resp) {
		if (resp !== null) { logger.log("info", resp); }
	});
});

bot.on("disconnected", function () {
	logger.log("info", "Disconnected");
	if (!config.is_heroku_version) { process.exit(0); }
	else { //if on heroku try to re-connect
		setTimeout(function(){
			logger.log("info", "Attempting to log in...");
			bot.login(process.env.email, process.env.password, function (err, token) {
				if (err) { logger.log("error", err); process.exit(0); }
				if (!token) { logger.log("warn", "Failed to re-connect"); process.exit(0); }
			});}, 20000); //waits 20 seconds before doing
	}
});

bot.on("message", function (msg) {
	if (msg.channel.isPrivate && msg.author.id != bot.user.id && (/(https?:\/\/discord\.gg\/[A-Za-z0-9]+|https?:\/\/discordapp\.com\/invite\/[A-Za-z0-9]+)/.test(msg.content))) { carbonInvite(msg); } //accept invites sent in a DM
	if (msg.author.id == config.admin_id && msg.content.indexOf("$$eval$$ ") > -1 && msg.content.indexOf("(eval) ") < 10) { evaluateString(msg); return; } //bot owner eval command
	if (msg.mentions.length !== 0) { //cleverbot
		msg.mentions.forEach(function(usr) { 
			if (usr.id == bot.user.id && msg.content.startsWith("<@125367104336691200>")) { cleverbot(bot, msg); logger.log("info", msg.author.username+" asked the bot: "+msg.content.substring(22).replace(/\n/g, " ")); return; }
		});
	}
	if (msg.content[0] != config.command_prefix && msg.content[0] != config.mod_command_prefix) { return; } //if not a command
	if (msg.author.id == bot.user.id) { return; } //stop from replying to itself
	var cmd = msg.content.split(" ")[0].replace(/\n/g, " ").substring(1).toLowerCase();
	var suffix = msg.content.replace(/\n/g, " ").substring( cmd.length + 2 ); //seperate the command and suffix
	if (msg.content.startsWith(config.command_prefix)) { //normal commands
		if (commands.hasOwnProperty(cmd)) {
			try {
				logger.log("info", "" + msg.author.username + " executed: " + msg.content.replace(/\n/g, " "));
				if (commands[cmd].hasOwnProperty("cooldown")) {
					if (lastExecTime.hasOwnProperty(cmd)) {
						var cTime = new Date();
						var leTime = new Date(lastExecTime[cmd]);
						leTime.setSeconds(leTime.getSeconds() + commands[cmd].cooldown);
						if (cTime < leTime) { //if it is still on cooldown
							var left = (leTime - cTime) / 1000;
							if (msg.author.id != config.admin_id) { //admin bypass
								bot.sendMessage(msg, ":warning: This command is on cooldown with " + Math.round(left) + " seconds remaining");
								return;
							}
						} else { lastExecTime[cmd] = cTime; }
					} else { lastExecTime[cmd] = new Date(); }
				}
				commands[cmd].process(bot, msg, suffix);
				if (commands[cmd].hasOwnProperty("deleteCommand")) {
					if (commands[cmd].deleteCommand === true) { bot.deleteMessage(msg, {"wait": 3500}); } //delete command after 3.5 seconds
				}
				logger.log("debug", "Command processed: " + cmd);
			} catch (err) { logger.log("error", err); }
		}
	} else if (msg.content.startsWith(config.mod_command_prefix)) { //mod commands
		if (cmd == "reload") { reload(); bot.deleteMessage(msg); return; } //reload the .json files and modules
		if (mod.hasOwnProperty(cmd)) {
			try {
				logger.log("info", "" + msg.author.username + " executed: " + msg.content.replace(/\n/g, " "));
				if (mod[cmd].hasOwnProperty("cooldown")) {
					if (lastExecTime.hasOwnProperty(cmd)) {
						var cTime = new Date();
						var leTime = new Date(lastExecTime[cmd]);
						leTime.setSeconds(leTime.getSeconds() + mod[cmd].cooldown);
						if (cTime < leTime) {
							var left = (leTime - cTime) / 1000;
							if (msg.author.id != config.admin_id) {
								bot.sendMessage(msg, ":warning: This command is on cooldown with " + Math.round(left) + " seconds remaining");
								return;
							}
						} else { lastExecTime[cmd] = cTime; }
					} else { lastExecTime[cmd] = new Date(); }
				}
				mod[cmd].process(bot, msg, suffix);
				if (mod[cmd].hasOwnProperty("deleteCommand")) {
					if (mod[cmd].deleteCommand === true) { bot.deleteMessage(msg, {"wait": 3500}); }
				}
				logger.log("debug", "Command processed: " + cmd);
			} catch (err) { logger.log("error", err); }
		}
	}
});

//event listeners
bot.on('serverNewMember', function (objServer, objUser) {
	if (objServer.members.length < 71 && config.non_essential_event_listeners) {
		if (config.greet_new_memebrs) { logger.log("info", "New member on " + objServer.name + ": " + objUser.username); bot.sendMessage(objServer.defaultChannel, "Welcome to " + objServer.name + " " + objUser.username); }
	}
});

bot.on('serverUpdated', function (objServer, objNewServer) {
	if (config.non_essential_event_listeners) { logger.log("debug", "" + objServer.name + " is now " + objNewServer.name); }
});

bot.on('channelCreated', function (objChannel) {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate){ logger.log("debug", "New channel created. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name); }
	}
});

bot.on('channelDeleted', function (objChannel) {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) { logger.log("debug", "Channel deleted. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name); }
	}
});

bot.on('channelUpdated', function (objChannel) { //You could make this find the new channel by id to get new info
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) {
			if (objChannel.type == "text") { logger.log("debug", "Channel updated. Was: Type: Text. Name: " + objChannel.name + ". Topic: " + objChannel.topic); }
			else { logger.log("debug", "Channel updated. Was: Type: Voice. Name: " + objChannel.name + "."); }
		}
	}
});

bot.on('userBanned', function (objUser, objServer) {
	if (objServer.members.length < 301 && config.non_essential_event_listeners) {
		logger.log("info", "" + objUser.username + " banned on " + objServer.name);
		bot.sendMessage(objServer.defaultChannel, ":warning: " + objUser.username + " was banned");
		bot.sendMessage(objUser, ":warning: You were banned from " + objServer.name);
	}
});

bot.on('userUnbanned', function (objUser, objServer) {
	if (objServer.members.length < 301 && config.non_essential_event_listeners) { logger.log("info", ":warning: " + objUser.username + " unbanned on " + objServer.name); }
});

bot.on('userUpdated', function (objUser, objNewUser) {
	if (config.non_essential_event_listeners) {
		if (objUser.username != objNewUser.username){ //if new username
			//logger.log("info", "" + objUser.username + " changed their name to " + objNewUser.username);
			if (config.username_changes) {
				bot.servers.forEach(function(ser){
					if (ser.members.get('id', objUser.id) !== null && ser.members.length < 101){ bot.sendMessage(ser, ":warning: User in this server: `" + objUser.username + "`. changed their name to: `" + objNewUser.username + "`."); }
				});
			}
		}
	}
});

bot.on('presence', function(user, status, game) {
	if (config.log_presence) { logger.log("debug", "Presence: " + user.username + " is now " + status + " playing " + game); }
});

bot.on('serverDeleted', function(objServer) { //detect when the bot leaves a server
	logger.log("info", "Left server "+objServer.name);
});

//login
logger.log("info", "Logging in...");
if (config.is_heroku_version) {
	bot.login(process.env.email, process.env.password, function (err, token) {
		if (err) { logger.log("error", err); setTimeout(function(){ process.exit(0); }, 2000); }
		if (!token) { logger.log("warn", "failed to connect"); setTimeout(function(){ process.exit(0); }, 2000); } //make sure it logged in successfully
	});
}
else { 
	bot.login(config.email, config.password, function (err, token) {
		if (err) { logger.log("error", err); setTimeout(function(){ process.exit(1); }, 2000); }
		if (!token) { logger.log("warn", "failed to connect"); setTimeout(function(){ process.exit(1); }, 2000); }
	});
}

function carbonInvite(msg){
	if (msg) {
		try {
			bot.joinServer(msg.content, function (err, server) {
				if (err) {
					bot.sendMessage(msg, ":warning: Failed to join: " + err);
					logger.log("warn", err);
				} else {
					logger.log("info", "Joined server: " + server.name);
					bot.sendMessage(msg, ":white_check_mark: Successfully joined ***" + server.name + "***");
					if (msg.author.id != 109338686889476096) { bot.sendMessage(msg, "It's not like I wanted you to use `"+config.command_prefix+"joins` or anything, b-baka!"); }
					if (shouldCarbonAnnounce) {
						var msgArray = [];
						msgArray.push("Hi! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author + ".");
						msgArray.push("You can use `" + config.command_prefix + "help` to see what I can do. Mods can use `"+config.mod_command_prefix+"help` for mod commands.");
						msgArray.push("If I shouldn't be here someone with the `Kick Members` permission can use `" + config.mod_command_prefix + "leaves` to make me leave");
						bot.sendMessage(server.defaultChannel, msgArray);
					}
				}
			});
		} catch(err) { bot.sendMessage(msg, ":heavy_exclamation_mark: Bot encountered an error while joining"); logger.log("error", err); }
	}
}

function reload() {
	delete require.cache[require.resolve('./bot/config.json')]; //delete cache or it won't work
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
	delete require.cache[require.resolve('./bot/cleverbot.js')];
	cleverbot = require("./bot/cleverbot").cleverbot;
	logger.info("Reloaded modules with no errors");
}

function checkConfig() {
	if (config.is_heroku_version) {
		if (process.env.email === null) { logger.log("warn", "Email not defined"); }
		if (process.env.password === null) { logger.log("warn", "Password not defined"); }
		if (config.command_prefix === null || config.command_prefix.length !== 1) { logger.log("warn", "Prefix either not defined or more than one character"); }
		if (config.mod_command_prefix === null || config.mod_command_prefix.length !== 1) { logger.log("warn", "Mod prefix either not defined or more than one character"); }
		if (config.admin_id === null) { logger.log("info", "Admin user's id not defined"); }
		if (process.env.mal_user === null) { logger.log("info", "MAL username not defined"); }
		if (process.env.mal_pass === null) { logger.log("info", "MAL password not defined"); }
		if (process.env.weather_api_key === null) { logger.log("info", "OpenWeatherMap API key not defined"); }
		if (process.env.osu_api_key === null) { logger.log("info", "Osu API key not defined"); }
	} else {
		if (config.email === null) { logger.log("warn", "Email not defined"); }
		if (config.password === null) { logger.log("warn", "Password not defined"); }
		if (config.command_prefix === null || config.command_prefix.length !== 1) { logger.log("warn", "Prefix either not defined or more than one character"); }
		if (config.mod_command_prefix === null || config.mod_command_prefix.length !== 1) { logger.log("warn", "Mod prefix either not defined or more than one character"); }
		if (config.admin_id === null) { logger.log("info", "Admin user's id not defined"); }
		if (config.mal_user === null) { logger.log("info", "MAL username not defined"); }
		if (config.mal_pass === null) { logger.log("info", "MAL password not defined"); }
		if (config.weather_api_key === null) { logger.log("info", "OpenWeatherMap API key not defined"); }
		if (config.osu_api_key === null) { logger.log("info", "Osu API key not defined"); }
	}
}

if (config.is_heroku_version) {
	var http = require("http");
	setInterval(function() {
		http.get("http://sheltered-river-1376.herokuapp.com"); //your URL here
	}, 1200000); //every 20 minutes to keep the bot from sleeping which breaks it
}

function evaluateString (msg) {
	/*EXTREMELY DANGEROUS so lets check again*/if (msg.author.id != config.admin_id) { logger.log("warn", "Somehow an unauthorized user got into eval!"); return; }
	logger.log("info", "Running eval");
	var result = eval(msg.content.substring(7).replace(/\n/g, ""));
	if (typeof result !== 'object') {
		bot.sendMessage(msg, result);
		logger.log("info", "Result: "+result);
	} else { logger.log("info", "Result was an object"); }

}

setInterval(function() {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
}, 800000); //change playing game every 12 minutes
