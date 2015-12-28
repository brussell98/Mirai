/*
==========
This is a "ping-pong bot" / music bot.
Run this with node to run the bot.
==========
*/

var discord = require("discord.js");
var commands = require("./bot/commands.js");
var config = require("./bot/config.json");
var games = require("./bot/games.json").games;
var perms = require("./bot/permissions.json");
var fs = require("fs");

var servers = getServers();

var bot = new discord.Client();
bot.on('warn', (m) => console.log('[warn]', m));
bot.on('debug', function(m){
	if (config.debug == 1) { console.log('[debug]', m) }
});

bot.on("ready", function (message) {
	checkServers();
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
	//check to see if there is a new version of BrussellBot
	console.log("BrussellBot is ready! Listening to " + bot.channels.length + " channels on " + bot.servers.length + " servers");
});

bot.on("disconnected", function () {
	console.log("Disconnected");
	process.exit(1);
});

bot.on("message", function(message) {
	if (!message.content.startsWith(config.command_prefix)) { return; }
	if (message.author.id == bot.user.id) { return; }
	console.log('[info]', "" + message.author.username + " executed: " + message.content);
	var cmd = message.content.split(" ")[0].substring(1).toLowerCase();
	var suffix = message.content.substring( cmd.length + 2 );
	var permLvl = 0;
	if (perms.hasOwnProperty(message.author.id)) { permLvl = perms[message.author.id].level; }
	if (commands.commands.hasOwnProperty(cmd)) {
		try {
			if (commands.commands[cmd].permLevel <= permLvl) { commands.commands[cmd].process(bot, message, suffix); }
			else {
				bot.sendMessage(message, "You need permission level " + commands.commands[cmd].permLevel + " to do that.");
				console.log('[info]', "Insufficient permissions");
			}
		} catch(err) {
			console.log('[warn]', "This command lacks a permLevel property");
			commands.commands[cmd].process(bot, message, suffix);
		}
	}
});

//event listeners
bot.on('serverNewMember', function (objServer, objUser) {
	if (servers[objServer.id].username_change == 1) {
		consolelog('[info]', "New member on " + objServer.name + ": " + objUser.username);
		bot.sendMessage(objServer.defaultChannel, "Welcome to " + objServer.name + " " + objUser.username);
	}
});

bot.on('serverUpdated', function (objServer, objNewServer) {
	if (config.non_essential_event_listeners) {
		console.log('[info]', "" + objServer.name + " is now " + objNewServer.name);
	}
});

bot.on('channelCreated', function (objChannel) {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate){
			console.log('[info]', "New channel created. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name);
		}
	}
});

bot.on('channelDeleted', function (objChannel) {
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) {
			console.log('[info]', "Channel deleted. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name);
		}
	}
});

bot.on('channelUpdated', function (objChannel) { //You could make this find the new channel by id to get new info
	if (config.non_essential_event_listeners) {
		if (!objChannel.isPrivate) {
			if (objChannel.type == "text") {
				console.log('[info]', "Channel updated. Was: Type: Text. Name: " + objChannel.name + ". Topic: " + objChannel.topic);
			} else {
				console.log('[info]', "Channel updated. Was: Type: Voice. Name: " + objChannel.name + ".");
			}
		}
	}
});

bot.on('userBanned', function (objUser, objServer) {
	if (servers[objServer.id].ban_message == 1) {
		console.log('[info]', "" + objUser.username + " banned on " + objServer.name);
		bot.sendMessage(objServer.defaultChannel, "" + objUser.username + " was banned");
		bot.sendMessage(objUser, "You were banned from " + objServer.name);
	}
});

bot.on('userUnbanned', function (objServer, objUser) {
	if (config.non_essential_event_listeners) {
		console.log('[info]', "" + objUser.username + " unbanned on " + objServer.name);
	}
});

bot.on('userUpdated', function (objUser, objNewUser) {
    if (objUser.username != objNewUser.username){
		console.log('[info]', "" + objUser.username + " changed their name to " + objNewUser.username);
		bot.servers.forEach(function(ser){
			if (ser.members.get('id', objUser.id) != null && servers[ser.id].username_change == 1){
				bot.sendMessage(ser, "User in this server: `" + objUser.username + "`. changed their name to: `" + objNewUser.username + "`.");
			}
		});
    }
    if (config.non_essential_event_listeners) {
    	if (objUser.avatar != objNewUser.avatar) {
    		console.log('[info]', "" + objNewUser.username + " changed their avatar to: " + objNewUser.avatarUrl);
    	}
    }
});

bot.on('presence', function(user, status, game) {
	if (config.log_presence) {
		console.log('[info]', "Presence: " + user.username + " is now " + status + " playing " + game);
	}
});

bot.on('serverCreated', function (objServer) {
	addServer(objServer);
});

//login
bot.login(config.email, config.password);
console.log("Logging in...");

function updateServers() {
	fs.writeFile("./bot/servers.json", JSON.stringify(servers, null, '\t'), null);
	servers = getServers();
	console.log('[info]', "Updated servers.json");
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
			console.log('[info]', "Found new server");
			addServer(ser);
		}
	});
}
