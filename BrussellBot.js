/*
==========
This is a "ping-pong bot" / music bot.
Run this with node to run the bot.
==========
*/

var discord = require("discord.js");
var commands = require("./bot/commands");
var config = require("./bot/config.json");
var games = require("./bot/games.json");
var perms = require("./bot/permissions");

var bot = new discord.Client();
bot.on('warn', (m) => console.log('[warn]', m));
bot.on('debug', (m) => console.log('[debug]', m));

bot.on("ready", function(message) {
	bot.setPlayingGame(games.games[Math.floor(Math.random() * ((Object.keys(games.games).length - 1) - 0)) + 0]);
	//check to see if there is a new version of BrussellBot
	console.log("BrussellBot is ready! Listening to " + bot.channels.length + " channels on " + bot.servers.length + " servers");
});

bot.on("disconnected", function () {
	console.log("Disconnected");
	process.exit(1);
});

bot.on("message", function(message) {
	if (!message.startsWith(config.command_prefix)){
		return;
	}
	if (message.author.id == bot.user.id){
		return;
	}
	console.log("" + message.author.username + " executed: " + msg.content);
	var cmd = message.content.split(" ")[0].substring(1).toLowerCase();
	var suffix = message.content.substring(cmd.length + 2);
	if (commands.commands.hasOwnProperty(cmd)) {
		commands.commands[cmd].process(bot, message, suffix)
	}
});

//event listeners
bot.on('serverNewMember', function(objServer, objUser) {
    consolelog('[info]', "New member on " + objServer.name + ": " + objUser.username);
	bot.sendMessage(objServer.defaultChannel, "Welcome to " + objServer.name + " " + objUser.username);
});

bot.on('serverUpdated', function(objServer, objNewServer) {
    console.log('[info]', "" + objServer.name + " is now " + objNewServer.name);
});

bot.on('channelCreated', function(objChannel) {
	if (!objChannel.isPrivate){
		console.log('[info]', "New channel created. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name);
	}
});

bot.on('channelDeleted', function(objChannel) {
    if (!objChannel.isPrivate){
		console.log('[info]', "Channel deleted. Type: " + objChannel.type + ". Name: " + objChannel.name + ". Server: " + objChannel.server.name);
	}
});

bot.on('channelUpdated', function(objChannel) { //You could make this match channel id's to get new info
    if (!objChannel.isPrivate){
		if (objChannel.type == "text"){
			console.log('[info]', "Channel updated. Was: Type: Text. Name: " + objChannel.name + ". Topic: " + objChannel.topic);
		} else {
			console.log('[info]', "Channel updated. Was: Type: Voice. Name: " + objChannel.name + ".");
		}
	}
});

bot.on('userBanned', function(objUser, objServer) {
    console.log('[info]', "" + objUser.username + " banned on " + objServer.name);
	bot.sendMessage(objServer.defaultChannel, "" + objUser.username + " was banned");
	bot.sendMessage(objUser, "You were banned from " + objServer.name);
});

bot.on('userUnbanned', function(objServer, objUser) {
    console.log('[info]', "" + objUser.username + " unbanned on " + objServer.name);
});

bot.on('userUpdated', function(objUser, objNewUser) {
    if (objUser.username != objNewUser.username){
		console.log('[info]', "" + objUser.username + " changed their name to " + objNewUser.username);
		bot.servers.forEach(function(ser){
			if (ser.members.get('id', objUser.id) != null){
				bot.sendMessage(ser, "User in this server: `" + objUser.username + "`. changed their name to: `" + objNewUser.username + "`.");
			}
		});
	}
	if (objUser.avatar != objNewUser.avatar){
		console.log('[info]', "" + objNewUser.username + " changed their avatar to: " + objNewUser.avatarUrl);
	}
});

//login
bot.login(congif.email, config.password);
console.log("Logging in...");
