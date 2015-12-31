var config = require("./config.json");
var games = require("./games.json").games;
var perms = require("./permissions.json");
var version = require("../package.json").version;
var chatlog = require("./logger.js").ChatLog;
var logger = require("./logger.js").Logger;

var fs = require('fs');

var commands = {
	"stats": {
		desc: "Get the stats of the bot",
		usage: "[-ls (list servers)] [-lc (list channels)]",
		cooldown: 60,
		process: function(bot, msg, suffix) {
			var msgArray = [];
			msgArray.push("```");
			msgArray.push("Uptime: " + (Math.round(bot.uptime / (1000 * 60 * 60))) + " hours, " + (Math.round(bot.uptime / (1000 * 60)) % 60) + " minutes, and " + (Math.round(bot.uptime / 1000) % 60) + " seconds.");
			msgArray.push("Connected to " + bot.servers.length + " servers and " + bot.channels.length + " channels.");
			msgArray.push("Serving " + bot.users.length + " users.");
			msgArray.push("Username: " + bot.user.username);
			msgArray.push("Running BrussellBot v" + version);
			msgArray.push("```");
			bot.sendMessage(msg, msgArray);

			fs.readFile("./logs/debug.txt", 'utf8', function (err, data) {
				if (err) { logger.log("warn", "Error getting debug logs: " + err); }
				logger.log("debug", "Fetched debug logs");
				data = data.split(/\r?\n/);
				var count = 0;
				for (line of data) {
					if (line.indexOf(" - debug: Command processed: ") != -1) { count += 1; }
				}
				bot.sendMessage(msg, "`Commands processed: " + count + "`");
			});

			fs.readFile("./logs/messages.txt", 'utf8', function (err, data) {
				if (err) { logger.log("warn", "Error getting chat logs: " + err); }
				logger.log("debug", "Fetched chat logs");
				bot.sendMessage(msg, "`Messages logged: " + data.split(/\r?\n/).length + "`");
			});

			if (suffix.indexOf("-ls") != -1) { bot.sendMessage(msg, "```\n" + bot.servers.join(", ") + "\n```"); }
			if (suffix.indexOf("-lc") != -1) { bot.sendMessage(msg, "```\n" + bot.channels.join(", ") + "\n```"); }
		}
	},
	"playing": {
		desc: "Set what the bot is playing. Leave empty for random.",
		usage: "[game]",
		cooldown: 5,
		process: function (bot, msg, suffix) {
			!suffix ? bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]) : bot.setPlayingGame(suffix);
			logger.log("info", "" + msg.author.username + " set the playing status to: " + suffix);
		}
	},
	"clean": {
		desc: "Cleans the specified number of bot messages from the channel.",
		usage: "<number of bot messages>",
		cooldown: 10,
		process: function (bot, msg, suffix) {
			if (suffix) {
				bot.getChannelLogs(msg.channel, 100, function (error, messages) {
					if (error) {
						logger.log("warn", "Something went wrong while fetching logs.");
						return;
					} else {
						bot.startTyping(msg.channel);
						logger.log("debug", "Cleaning bot messages...");
						var todo = suffix,
						delcount = 0;
						for (msg1 of messages) {
							if (msg1.author === bot.user) {
								bot.deleteMessage(msg1);
								delcount++;
								todo--;
							}
							if (todo == 0) {
								logger.log("debug", "Done! Deleted " + delcount + " messages.");
								bot.stopTyping(msg.channel);
								return;
							}
						}
						bot.stopTyping(msg.channel);
					}
				});
			} else { bot.sendMessage(msg, correctUsage("clean")); }
		}
	},
	"leaves": {
		desc: "Leaves the server.",
		process: function(bot, msg, suffix) {
			if (msg.channel.server) {
				if (msg.channel.permissionsOf(msg.author).hasPermission("kickMembers")) {
					bot.sendMessage(msg, "Alright, I'll leave :(");
					bot.leaveServer(msg.channel.server);
					logger.log("info", "I've left a server on request of " + msg.sender.username + ". I'm only in " + bot.servers.length + " servers now.");
				} else {
					bot.sendMessage(msg, "You can't tell me what to do! (You need permission to kick users in this channel)");
					logger.log("info", "A non-privileged user (" + msg.sender.username + ") tried to make me leave a server.");
				}
			} else { bot.sendMessage(msg, "I can't leave a DM."); }
		}
	}
}

exports.commands = commands;
