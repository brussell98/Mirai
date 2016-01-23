/*
This is a multipurpose bot
Run this with node to run the bot.
//===================================================*/

var commands = require("./bot/commands.js").commands;
var mod = require("./bot/mod.js").commands;
var config = require("./bot/config.json");
var games = require("./bot/games.json").games;
var versioncheck = require("./bot/versioncheck.js");
var fs = require("fs");
var discord = require('discord.js');
var cleverbot = require("./bot/cleverbot.js").cleverbot;
var colors = require('./bot/styles.js');
checkConfig(); //notify user if they are missing things in the config

var lastExecTime = {}; //for cooldown
var shouldCarbonAnnounce = true; //set if the bot should announce when joining an invite sent without a command
var commandsProcessed = 0, talkedToTimes = 0;

var bot = new discord.Client();
bot.on('warn', function (m) { console.log(colors.cWarn(" WARN ")+m); });
bot.on('debug', function (m) { if (config.debug) { console.log(colors.cDebug(" DEBUG ")+m); } });

bot.on("ready", function () {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]); //set game to a random game from games.json
	//bot.setPlayingGame("]help [command]");
	console.log(colors.cGreen("BrussellBot is ready!")+" Listening to " + bot.channels.length + " channels on " + bot.servers.length + " servers");
	versioncheck.checkForUpdate(function (resp) {
		if (resp !== null) { console.log(resp); }
	});
});

bot.on("disconnected", function () {
	console.log(colors.cRed("Disconnected")+" from Discord");
	if (!config.is_heroku_version) { process.exit(0); }
	else { //if on heroku try to re-connect
		setTimeout(function(){
			console.log("Attempting to log in...");
			bot.login(process.env.email, process.env.password, function (err, token) {
				if (err) { console.log(err); process.exit(0); }
				if (!token) { console.log(colors.cWarn(" WARN ")+"Failed to re-connect"); process.exit(0); }
			});}, 20000); //waits 20 seconds before doing
	}
});

bot.on("message", function (msg) {
	if (msg.channel.isPrivate && msg.author.id != bot.user.id && (/(^https?:\/\/discord\.gg\/[A-Za-z0-9]+$|^https?:\/\/discordapp\.com\/invite\/[A-Za-z0-9]+$)/.test(msg.content))) { carbonInvite(msg); } //accept invites sent in a DM
	if (msg.author.id == config.admin_id && msg.content.indexOf("(eval) ") > -1 && msg.content.indexOf("(eval) ") <= 1) { evaluateString(msg); return; } //bot owner eval command
	if (msg.mentions.length !== 0) { //cleverbot
		msg.mentions.forEach(function(usr) { 
			if (usr.id == bot.user.id && msg.content.startsWith("<@"+bot.user.id+">")) { cleverbot(bot, msg); talkedToTimes += 1; if (!msg.channel.isPrivate) { console.log(colors.cServer(msg.channel.server.name)+" > "+colors.cGreen(msg.author.username)+" > "+colors.cYellow('@Bot-chan')+" "+msg.content.substring(22).replace(/\n/g, " ")); } else { console.log(colors.cGreen(msg.author.username)+" > "+colors.cYellow('@Bot-chan')+" "+msg.content.substring(22).replace(/\n/g, " ")); } return; }
		});
	}
	if (msg.content[0] != config.command_prefix && msg.content[0] != config.mod_command_prefix) { return; } //if not a command
	if (msg.author.id == bot.user.id) { return; } //stop from replying to itself
	var cmd = msg.content.split(" ")[0].replace(/\n/g, " ").substring(1).toLowerCase();
	var suffix = msg.content.replace(/\n/g, " ").substring( cmd.length + 2 ); //seperate the command and suffix
	if (msg.content.startsWith(config.command_prefix)) { //normal commands
		if (commands.hasOwnProperty(cmd)) {
			try {
				if (!msg.channel.isPrivate) { console.log(colors.cServer(msg.channel.server.name)+" > "+colors.cGreen(msg.author.username)+" > "+msg.content.replace(/\n/g, " ")); } else { console.log(colors.cGreen(msg.author.username)+" > "+msg.content.replace(/\n/g, " ")); }
				commandsProcessed += 1;
				if (commands[cmd].hasOwnProperty("cooldown")) {
					if (lastExecTime.hasOwnProperty(cmd)) {
						var id = msg.author.id;
						if (lastExecTime[cmd][id] != undefined) {
							var cTime = new Date();
							var leTime = new Date(lastExecTime[cmd][id]);
							leTime.setSeconds(leTime.getSeconds() + commands[cmd].cooldown);
							if (cTime < leTime) { //if it is still on cooldown
								var left = (leTime - cTime) / 1000;
								if (msg.author.id != config.admin_id) { //admin bypass
									bot.sendMessage(msg, msg.author.username+", you can't use this command for " + Math.round(left) + " more seconds", function (erro, message) { bot.deleteMessage(message, {"wait": 6000}); });
									return;
								}
							} else { lastExecTime[cmd][id] = cTime; }
						} else { lastExecTime[cmd][id] = new Date(); }
					} else { lastExecTime[cmd] = {}; }
				}
				commands[cmd].process(bot, msg, suffix);
				if (commands[cmd].hasOwnProperty("deleteCommand")) {
					if (commands[cmd].deleteCommand === true) { bot.deleteMessage(msg, {"wait": 8000}); } //delete command after 3.5 seconds
				}
			} catch (err) { console.log(err); }
		}
	} else if (msg.content.startsWith(config.mod_command_prefix)) { //mod commands
		if (cmd == "reload") { reload(); bot.deleteMessage(msg); return; } //reload the .json files and modules
		if (mod.hasOwnProperty(cmd)) {
			try {
				if (!msg.channel.isPrivate) { console.log(colors.cServer(msg.channel.server.name)+" > "+colors.cGreen(msg.author.username)+" > "+msg.content.replace(/\n/g, " ")); } else { console.log(colors.cGreen(msg.author.username)+" > "+msg.content.replace(/\n/g, " ")); }
				commandsProcessed += 1;
				if (mod[cmd].hasOwnProperty("cooldown")) {
					if (lastExecTime.hasOwnProperty(cmd)) {
						var id = msg.author.id;
						if (lastExecTime[cmd][id] != undefined) {
							var cTime = new Date();
							var leTime = new Date(lastExecTime[cmd][id]);
							leTime.setSeconds(leTime.getSeconds() + mod[cmd].cooldown);
							if (cTime < leTime) { //if it is still on cooldown
								var left = (leTime - cTime) / 1000;
								if (msg.author.id != config.admin_id) { //admin bypass
									bot.sendMessage(msg, msg.author.username+", you can't use this command for " + Math.round(left) + " more seconds", function (erro, message) { bot.deleteMessage(message, {"wait": 6000}); });
									return;
								}
							} else { lastExecTime[cmd][id] = cTime; }
						} else { lastExecTime[cmd][id] = new Date(); }
					} else { lastExecTime[cmd] = {}; }
				}
				mod[cmd].process(bot, msg, suffix, commandsProcessed, talkedToTimes);
				if (mod[cmd].hasOwnProperty("deleteCommand")) {
					if (mod[cmd].deleteCommand === true) { bot.deleteMessage(msg, {"wait": 6000}); }
				}
			} catch (err) { console.log(err); }
		}
	}
});

//event listeners
bot.on('serverNewMember', function (objServer, objUser) {
	if (objServer.members.length < 71 && config.non_essential_event_listeners) {
		if (config.greet_new_memebrs) { console.log("New member on " + objServer.name + ": " + objUser.username); bot.sendMessage(objServer.defaultChannel, "Welcome to " + objServer.name + " " + objUser.username); }
	}
});

bot.on('serverUpdated', function (objServer, objNewServer) {
	if (config.non_essential_event_listeners) { if (config.debug) { console.log(colors.cDebug(" DEBUG ")+objServer.name + " is now " + objNewServer.name); } }
});

bot.on('channelCreated', function (objChannel) {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate){ if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"New channel created. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name); } }
	}
});

bot.on('channelDeleted', function (objChannel) {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) { if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Channel deleted. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name); } }
	}
});

bot.on('channelUpdated', function (objChannel) { //You could make this find the new channel by id to get new info
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) {
			if (objChannel.type == "text") { if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Channel updated. Was: Type: Text. Name: " + objChannel.name + ". Topic: " + objChannel.topic); } }
			else { if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Channel updated. Was: Type: Voice. Name: " + objChannel.name + "."); } }
		}
	}
});

bot.on('userBanned', function (objUser, objServer) {
	if (objServer.members.length < 301 && config.non_essential_event_listeners) {
		console.log(objUser.username + colors.cRed(" banned on ") + objServer.name);
		bot.sendMessage(objServer.defaultChannel, ":warning: " + objUser.username + " was banned");
		bot.sendMessage(objUser, ":warning: You were banned from " + objServer.name);
	}
});

bot.on('userUnbanned', function (objUser, objServer) {
	if (objServer.members.length < 301 && config.non_essential_event_listeners) { console.log(objUser.username + " unbanned on " + objServer.name); }
});

bot.on('userUpdated', function (objUser, objNewUser) {
	if (config.non_essential_event_listeners) {
		if (objUser.username != objNewUser.username){ //if new username
			if (config.username_changes) {
				if (config.debug) { console.log(colors.cDebug(" DEBUG ")+objUser.username + " changed their name to " + objNewUser.username); }
				bot.servers.forEach(function(ser){
					if (ser.members.has('id', objUser.id) && ser.members.length < 101){ bot.sendMessage(ser, ":warning: User in this server: `" + objUser.username + "`. changed their name to: `" + objNewUser.username + "`."); }
				});
			}
		}
	}
});

bot.on('presence', function(userOld, userNew) { //check if game and also it's now oldUser newUser
	if (config.log_presence) { if (config.debug) { 
		if (userNew.game === null) { console.log(colors.cDebug(" PRESENCE ")+ userNew.username + " is now " + userNew.status); }
		else { console.log(colors.cDebug(" PRESENCE ")+ userNew.username + " is now " + userNew.status + " playing " + userNew.game.name); }
	} }
});

bot.on('serverDeleted', function(objServer) { //detect when the bot leaves a server
	console.log(colors.cUYellow("Left server")+" "+objServer.name);
});

//login
console.log("Logging in...");
if (config.is_heroku_version) {
	bot.login(process.env.email, process.env.password, function (err, token) {
		if (err) { console.log(err); setTimeout(function(){ process.exit(0); }, 2000); }
		if (!token) { console.log(colors.cWarn(" WARN ")+"failed to connect"); setTimeout(function(){ process.exit(0); }, 2000); } //make sure it logged in successfully
	});
}
else { 
	bot.login(config.email, config.password, function (err, token) {
		if (err) { console.log(err); setTimeout(function(){ process.exit(1); }, 2000); }
		if (!token) { console.log(colors.cWarn(" WARN ")+"failed to connect"); setTimeout(function(){ process.exit(1); }, 2000); }
	});
}

function carbonInvite(msg){
	if (msg) {
		try {
			if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Attempting to join: "+msg.content); }
			var cServers = [];
			bot.servers.map(function(srvr){cServers.push(srvr.id);});
			bot.joinServer(msg.content, function (err, server) {
				if (err) {
					bot.sendMessage(msg, "Failed to join: " + err);
					console.log(colors.cWarn(" WARN ")+err);
				} else if (!server || server.name == undefined || server.roles == undefined || server.channels == undefined || server.members == undefined) { //this problem is a pain in the ass
					console.log(colors.cWarn(" WARN ")+"Error joining server. Didn't receive all data.");
					bot.sendMessage(msg, "Failed to receive all data, please try again in a few seconds.");
					try {
						bot.leaveServer(server);
					} catch(error) { /*how did it get here?*/ }
				} else if (cServers.indexOf(server.id) > -1) {
					console.log("Already in server "+server.name);
					bot.sendMessage(msg, "I'm already in that server!");
				} else {
					console.log(colors.cGreen("Joined server: ")+" "+server.name);
					bot.sendMessage(msg, "Successfully joined " + server.name);
					if (msg.author.id != 109338686889476096) { bot.sendMessage(msg, "It's not like I wanted you to use `"+config.command_prefix+"joins` or anything, b-baka!"); }
					if (shouldCarbonAnnounce) {
						setTimeout(function(){
							var msgArray = [];
							msgArray.push("Hi! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author + ".");
							msgArray.push("You can use `" + config.command_prefix + "help` to see what I can do. Mods can use `"+config.mod_command_prefix+"help` for mod commands.");
							msgArray.push("If I shouldn't be here someone with the `Kick Members` permission can use `" + config.mod_command_prefix + "leaves` to make me leave");
							msgArray.push("For help / feedback / bugs/ testing / info / changelogs / etc. go to **discord.gg/0kvLlwb7slG3XCCQ**");
							bot.sendMessage(server.defaultChannel, msgArray);
						}, 2000);
					}
				}
			});
		} catch(err) { bot.sendMessage(msg, "Bot encountered an error while joining"); console.log(err); }
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
	console.log(colors.BgGreen(" Reloaded modules ")+" success");
}

function checkConfig() {
	if (config.is_heroku_version) {
		if (process.env.email === null) { console.log(colors.cWarn(" WARN ")+"Email not defined"); }
		if (process.env.password === null) { console.log(colors.cWarn(" WARN ")+"Password not defined"); }
		if (config.command_prefix === null || config.command_prefix.length !== 1) { console.log(colors.cWarn(" WARN ")+"Prefix either not defined or more than one character"); }
		if (config.mod_command_prefix === null || config.mod_command_prefix.length !== 1) { console.log(colors.cWarn(" WARN ")+"Mod prefix either not defined or more than one character"); }
		if (config.admin_id === null) { console.log(colors.cYellow("Admin user's id not defined")+" in process.env"); }
		if (process.env.mal_user === null) { console.log(colors.cYellow("MAL username not defined")+" in process.env"); }
		if (process.env.mal_pass === null) { console.log(colors.cYellow("MAL password not defined")+" in process.env"); }
		if (process.env.weather_api_key === null) { console.log(colors.cYellow("OpenWeatherMap API key not defined")+" in process.env"); }
		if (process.env.osu_api_key === null) { console.log(colors.cYellow("Osu API key not defined")+" in process.env"); }
	} else {
		if (config.email === null) { console.log(colors.cWarn(" WARN ")+"Email not defined"); }
		if (config.password === null) { console.log(colors.cWarn(" WARN ")+"Password not defined"); }
		if (config.command_prefix === null || config.command_prefix.length !== 1) { console.log(colors.cWarn(" WARN ")+"Prefix either not defined or more than one character"); }
		if (config.mod_command_prefix === null || config.mod_command_prefix.length !== 1) { console.log(colors.cWarn(" WARN ")+"Mod prefix either not defined or more than one character"); }
		if (config.admin_id === null) { console.log(colors.cYellow("Admin user's id not defined")+" in config"); }
		if (config.mal_user === null) { console.log(colors.cYellow("MAL username not defined")+" in config"); }
		if (config.mal_pass === null) { console.log(colors.cYellow("MAL password not defined")+" in config"); }
		if (config.weather_api_key === null) { console.log(colors.cYellow("OpenWeatherMap API key not defined")+" in config"); }
		if (config.osu_api_key === null) { console.log(colors.cYellow("Osu API key not defined")+" in config"); }
	}
}

if (config.is_heroku_version) {
	var http = require("http");
	setInterval(function() {
		http.get("http://sheltered-river-1376.herokuapp.com"); //your URL here
	}, 1320000); //every 22 minutes to keep the bot from sleeping which breaks it
}

function evaluateString (msg) {
	/*EXTREMELY DANGEROUS so lets check again*/if (msg.author.id != config.admin_id) { console.log(colors.cWarn(" WARN ")+"Somehow an unauthorized user got into eval!"); return; }
	console.log(colors.cWarn(" WARN ")+"Running eval");
	var result = eval("try{"+msg.content.substring(7).replace(/\n/g, "")+"}catch(err){console.log(colors.cError(\" ERROR \")+err);bot.sendMessage(msg, \"```\"+err+\"```\");}");
	if (typeof result !== 'object') {
		bot.sendMessage(msg, result);
		console.log("Result: "+result);
	}

}

setInterval(function() {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
}, 800000); //change playing game every 12 minutes
