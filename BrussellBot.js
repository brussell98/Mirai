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

//event listeners comming soon

bot.login(congif.email, config.password);
console.log("Logging in...");