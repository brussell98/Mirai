var config = require("./config.json");
var games = require("./games.json").games;
var perms = require("./permissions.json");
var version = require("../package.json").version;
var chatlog = require("./logger.js").ChatLog;
var logger = require("./logger.js").Logger;

var fs = require('fs');

/*
=====================
Functions
=====================
*/

function correctUsage(cmd) {
	var msg = "Usage: " + config.mod_command_prefix + "" + cmd + " " + commands[cmd].usage;
	return msg;
}

function givePerm(lvl, usr) {
	if (!perms.hasOwnProperty(usr.id)) {
		permst = perms;
		var value = {
			"level": parseInt(lvl)
		}
		permst[usr.id] = value;
		fs.writeFile("./bot/permissions.json", JSON.stringify(permst, null, '\t'), null);
	} else {
		if (perms[usr.id].level != 3) {
			permst = perms;
			permst[usr.id].level = parseInt(lvl);
			fs.writeFile("./bot/permissions.json", JSON.stringify(permst, null, '\t'), null);
		}
	}
}

/*
=====================
Commands
=====================
*/

var commands = {
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]",
		permLevel: 0,
		process: function(bot, msg, suffix) {
			var msgArray = [];
			if (!suffix){
				var msgArray = [];
				msgArray.push("This is a list of commands. Use `" + config.mod_command_prefix + "help <command name>` to get info on a specific command.");
				msgArray.push("");
				msgArray.push("**Commands: **");
				msgArray.push("```");
				Object.keys(commands).forEach(function(cmd){ msgArray.push("" + config.mod_command_prefix + "" + cmd + ": " + commands[cmd].desc + ""); });
				msgArray.push("```");
				bot.sendMessage(msg.author, msgArray);
			}
			if (suffix){
				if (commands.hasOwnProperty(suffix)){
					var msgArray = [];
					msgArray.push("**" + config.mod_command_prefix + "" + suffix + ": **" + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { msgArray.push("**Usage: **`" + config.mod_command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("permLevel")) { msgArray.push("**Permission level** (not required for some): " + commands[suffix].permLevel); }
					if (commands[suffix].hasOwnProperty("cooldown")) { msgArray.push("**Cooldown: **" + commands[suffix].cooldown + " seconds"); }
					bot.sendMessage(msg.author, msgArray);
				} else { bot.sendMessage(msg.author, "Command `" + suffix + "` not found."); }
			}
		}
	},
	"stats": {
		desc: "Get the stats of the bot",
		usage: "[-ls (list servers)] [-lc (list channels)]",
		cooldown: 60,
		permLevel: 2,
		process: function(bot, msg, suffix, hp) {
			if (hp) {
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
				bot.sendMessage(msg, "`Commands processed this session: " + count + "`");
			});

			if (suffix.indexOf("-ls") != -1) { bot.sendMessage(msg, "```\n" + bot.servers.join(", ") + "\n```"); }
			} else { bot.sendMessage(msg, "Only server owners can do this."); }
		}
	},
	"playing": {
		desc: "Set what the bot is playing. Leave empty for random.",
		usage: "[game]",
		cooldown: 5,
		permLevel: 1,
		process: function (bot, msg, suffix, hp) {
			if (hp) {
				!suffix ? bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]) : bot.setPlayingGame(suffix);
				logger.log("info", "" + msg.author.username + " set the playing status to: " + suffix);
			} else { console.log("info", "User has insufficient perms"); }
		}
	},
	"clean": {
		desc: "Cleans the specified number of bot messages from the channel.",
		usage: "<number of bot messages>",
		cooldown: 10,
		permLevel: 1,
		process: function (bot, msg, suffix, hp) {
			if (suffix) {
				if (hp || msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageMessages")) {
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
				} else { bot.sendMessage(msg, "*Invalid permissions*"); }
			} else { bot.sendMessage(msg, correctUsage("clean")); }
		}
	},
	"leaves": {
		desc: "Leaves the server.",
		permLevel: 3,
		process: function(bot, msg, suffix, hp) {
			if (msg.channel.server) {
				if (hp || msg.channel.permissionsOf(msg.author).hasPermission("kickMembers")) {
					bot.sendMessage(msg, "Alright, I'll leave :(");
					givePerm("1", msg.channel.server.owner);
					bot.leaveServer(msg.channel.server);
					logger.log("info", "I've left a server on request of " + msg.sender.username + ". I'm only in " + bot.servers.length + " servers now.");
				} else {
					bot.sendMessage(msg, "You can't tell me what to do! (You need permission to kick users in this channel)");
					logger.log("info", "A non-privileged user (" + msg.sender.username + ") tried to make me leave a server.");
				}
			} else { bot.sendMessage(msg, "I can't leave a DM."); }
		}
	},
	"announce": {
		desc: "Bot owner only",
		permLevel: 0,
		usage: "<message>",
		cooldown: 30,
		process: function (bot, msg, suffix) {
			if (suffix) {
				if (msg.channel.isPrivate && perms.hasOwnProperty(msg.author.id)) {
					if (perms[msg.author.id].level == 3) {
						bot.servers.forEach(function (ser) {
							bot.sendMessage(ser.defaultChannel, suffix + " - " + msg.author);
						});
						logger.log("info", "Announced \"" + suffix + "\" to servers");
					} else { bot.sendMessage(msg, "Need perm level 3"); }
				}
			}
		}
	}/*,
	"giveperm": {
		desc: "Give the user the permission level specified",
		permLevel: 2,
		usage: "<level below yours> <mention user>",
		process: function(bot, msg, suffix, hp) {
			if (hp || msg.author.id == msg.channel.server.owner.id) {
			if (suffix && suffix.split(" ")[1].indexOf("@") != -1 && suffix.split(" ")[0].length == 1) {
				//if (suffix.split(" ")[0] < perms[msg.author.id].level) {
					msg.mentions.map(function (usr) {
						if (perms.hasOwnProperty(usr.id)) {
							if (perms[msg.author.id].level > perms[usr.id]) {
								givePerm(suffix.split(" ")[0], usr);
								logger.log("info", "Updated " + usr.username + "s perm level to " + suffix.split(" ")[0]);
								bot.sendMessage(msg, "Updated, use "+config.mod_command_prefix+"reload for this change to take effect");
							}
						} else {
							givePerm(suffix.split(" ")[0], usr);
							logger.log("info", "Updated " + usr.username + "s perm level to " + suffix.split(" ")[0]);
							bot.sendMessage(msg, "Updated, use "+config.mod_command_prefix+"reload for this change to take effect");
						}
					});
				//} else { bot.sendMessage(msg, "You can only give a user a perm level below yours"); }
			} else { bot.sendMessage(msg, correctUsage("giveperm")); }
			}
		}
	}*/
}

exports.commands = commands;
