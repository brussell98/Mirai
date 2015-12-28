var config = require("./config.json");
var games = require("./games.json").games;
var perms = require("./permissions.json");
var version = require("../package.json").version;

var request = require('request');

/*
====================
Functions
====================
*/

function correctUsage(cmd) {
	var msg = "Usage: " + config.command_prefix + "" + cmd + " " + commands[cmd].usage;
	return msg;
}

/*
====================
Commands (Check https://github.com/brussell98/BrussellBot/wiki/New-Command-Guide for how to make new ones)
====================
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
				msgArray.push("This is a list of commands. Use `" + config.command_prefix + "help <command name>` to get info on a specific command.");
				msgArray.push("");
				msgArray.push("**Commands: **");
				msgArray.push("```");
				Object.keys(commands).forEach(function(cmd){ msgArray.push("" + config.command_prefix + "" + cmd + ": " + commands[cmd].desc + ""); });
				msgArray.push("```");
				bot.sendMessage(msg.author, msgArray);
			}
			if (suffix){
				if (commands.hasOwnProperty(suffix)){
					var msgArray = [];
					msgArray.push("**" + config.command_prefix + "" + suffix + ": **" + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { msgArray.push("**Usage: **`" + config.command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("permLevel")) { msgArray.push("**Permission level: **" + commands[suffix].permLevel); }
					bot.sendMessage(msg.author, msgArray);
				} else { bot.sendMessage(msg.author, "Command `" + suffix + "` not found."); }
			}
		}
	},
	"ping": {
		desc: "Replies with pong.",
		permLevel: 0,
		process: function(bot, msg) {
			bot.sendMessage(msg, "pong");
		}
	},
	"joins": {
		desc: "Accepts the invite sent to it.",
		usage: "<invite link> [-s (silent join)]",
		permLevel: 0,
		process: function (bot, msg, suffix) {
			if (suffix) {
				var invite = suffix.split(" ")[0];
				bot.joinServer(invite, function (err, server) {
					if (err) {
						bot.sendMessage(msg, "Failed to join: " + err);
						console.log('[warn]', err);
					} else {
						console.log('[info]', "Joined server: " + server);
						bot.sendMessage(msg, "Successfully joined ***" + server + "***");
						if (suffix.split(" ")[1] != "-s") {
							var msgArray = [];
							msgArray.push("Hi! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author + ".");
							msgArray.push("You can use `" + config.command_prefix + "help` to see what I can do.");
							msgArray.push("If I shouldn't be here someone with the `Kick Members` permission can use `" + config.command_prefix + "leaves` to make me leave");
							bot.sendMessage(server.defaultChannel, msgArray);
							msgArray = [];
							msgArray.push("Hey " + server.owner.username + ", I've joined a server that you own.");
							msgArray.push("I'm " + bot.user.username + " by the way, a \"ping-pong\" bot / music bot designed to make your life easier.");
							msgArray.push("If you don't want me in your server, you may use `" + ConfigFile.command_prefix + "leaves` in the server I'm not welcome in.");
							msgArray.push("If you do want me, use `" + ConfigFile.command_prefix + "help` to see what I can do.");
							bot.sendMessage(server.owner, msgArray);
						}
					}
				});
			} else { bot.sendMessage(msg, correctUsage("help")); }
				
		}
	},
	"leaves": {
		desc: "Leaves the server.",
		permLevel: 2,
		process: function(bot, msg, suffix) {
			if (msg.channel.server) {
				if (msg.channel.permissionsOf(msg.author).hasPermission("kickMembers")) {
					bot.sendMessage(msg, "Alright, see ya!");
					bot.leaveServer(msg.channel.server);
					console.log('[info]', "I've left a server on request of " + msg.sender.username + ". I'm only in " + bot.servers.length + " servers now.");
				} else {
					bot.sendMessage(msg, "You can't tell me what to do! (You need permission to kick users in this channel)");
					console.log('[info]', "A non-privileged user (" + msg.sender.username + ") tried to make me leave a server.");
				}
			} else { bot.sendMessage(msg, "I can't leave a DM."); }
		}
	},
	"about": {
		desc: "Info about the bot.",
		permLevel: 0,
		process: function(bot, msg, suffix) {
			var msgArray = [];
			msgArray.push("I'm " + bot.user.username + " and I was made by brussell98.");
			msgArray.push("I run on the unofficial Discord API `Discord.js`");
			msgArray.push("My GitHub page is https://github.com/brussell98/BrussellBot");
			bot.sendMessage(msg, msgArray);
		}
	},
	"stats": {
		desc: "Displays current stats for the bot.",
		permLevel: 0,
		usage: "[-t (exclude uptime)] [-c (exclude connected to)] [-u (exclude users)] [-v (exclude name & version)] [-ls (list servers)] [-lc (list channels)]",
		process: function (bot, msg, suffix) {
			var args = suffix.split(" ");
			var msgArray = [];
			if (args.indexOf("-t") == -1) {
				msgArray.push("Uptime: **" + (Math.round(bot.uptime / (1000 * 60 * 60))) + "** hours, **" + (Math.round(bot.uptime / (1000 * 60)) % 60) + "** minutes, and **" + (Math.round(bot.uptime / 1000) % 60) + "** seconds.");
			}
			if (args.indexOf("-c") == -1) { msgArray.push("Connected to **" + bot.servers.length + "** servers and **" + bot.channels.length + "** channels."); }
			if (args.indexOf("-u") == -1) { msgArray.push("Serving **" + bot.users.length + "** users."); }
			if (args.indexOf("-v") == -1) { msgArray.push("I'm known as " + bot.user.username + " and I'm running BrussellBot v" + version); }
			bot.sendMessage(msg, msgArray);
			if (args.indexOf("-ls") != -1) { bot.sendMessage(msg, bot.servers); }
			if (args.indexOf("-lc") != -1) { bot.sendMessage(msg, bot.channels); }
		}
	},
	"playing": {
		desc: "Set what the bot is playing. Leave empty for random.",
		permLevel: 1,
		usage: "[game]",
		process: function (bot, msg, suffix) {
			!suffix ? bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]) : bot.setPlayingGame(suffix);
			console.log('[info]', "" + msg.author.username + " set the playing status to: " + bot.user.game);
		}
	},
	"clean": {
		desc: "Cleans the specified number of bot messages from the channel.",
		permLevel: 1,
		usage: "<number of bot messages>",
		process: function (bot, msg, suffix) {
			if (suffix) {
				bot.getChannelLogs(msg.channel, 100, function (error, messages) {
					if (error) {
						console.log('[warn]', "Something went wrong while fetching logs.");
						return;
					} else {
						console.log("Cleaning bot messages...");
						var todo = suffix,
						delcount = 0;
						for (msg1 of messages) {
							if (msg1.author === bot.user) {
								bot.deleteMessage(msg1);
								delcount++;
								todo--;
							}
							if (todo == 0) {
								console.log("Done! Deleted " + delcount + " messages.");
								return;
							}
						}
					}
				});
			} else { bot.sendMessage(msg, correctUsage("clean")); }
		}
	},
	"letsplay": {
		desc: "Ask if anyone wants to play a game.",
		permLevel: 0,
		usage: "[game name]",
		process: function(bot, msg, suffix) {
			if (suffix) { bot.sendMessage(msg, "@everyone, " + msg.author + " would like to know if anyone wants to play **" + suffix + "**."); }
			else { bot.sendMessage(msg, "@everyone, " + msg.author + " would like to know if anyone wants to play a game"); }
		}
	},
	"roll": {
		desc: "Rolls a die.",
		permLevel: 0,
		usage: "[(rolls)d(sides)]",
		process: function(bot, msg, suffix) {
			var dice = "1d6";
			if (suffix) { dice = suffix; }
			request('https://rolz.org/api/?' + dice + '.json', function(err, response, body) {
				if (!err && response.statusCode == 200) {
					var roll = JSON.parse(body);
					bot.sendMessage(msg, "Your " + roll.input + " resulted in " + roll.result + " " + roll.details);
				} else { console.log('[warn]', "Got an error: ", error, ", status code: ", response.statusCode); }
			});
		}
	},
	"announce": {
		desc: "Sends a message to all servers if in a DM. If in a server sends it to all users in that server.",
		permLevel: 2,
		usage: "<message>",
		process: function (bot, msg, suffix) {
			if (suffix) {
				if (!msg.channel.isPrivate) {
					msg.channel.server.members.forEach(function (usr) {
						bot.sendMessage(usr, suffix + " - " + msg.author);
					});
					console.log('[info]', "Announced \"" + suffix + "\" to members");
				} else if (msg.channel.isPrivate) {
					bot.servers.forEach(function (ser) {
						bot.sendMessage(ser.defaultChannel, suffix + " - " + msg.author);
					});
					console.log('[info]', "Announced \"" + suffix + "\" to servers");
				}
			}
		}
	},
	"info": {
		desc: "Gets info on the server or a user if specified.",
		permLevel: 0,
		usage: "[@username]",
		process: function (bot, msg, suffix) {
			if (suffix) {
				if (msg.mentions.length == 0) { bot.sendMessage(msg, correctUsage("info")); return; }
				msg.mentions.map(function (usr) {
					var msgArray = [];
					msgArray.push("You requested info on **" + usr.username + "**");
					msgArray.push("User ID: `" + usr.id + "`");
					if (usr.gameID != null) { msgArray.push("Staus: `" + usr.status + "` playing `" + usr.gameID + "`"); }
					else { msgArray.push("Staus: `" + usr.status + "`"); }
					msgArray.push("Roles: " + msg.channel.server.rolesOfUser(usr));
					if (usr.avatarURL != null) { msgArray.push("Avatar: " + usr.avatarURL); }
					bot.sendMessage(msg, msgArray);
					console.log('[info]', "Got info on " + usr.username);
				});
			} else {
				if (msg.channel.server) {
					var msgArray = [];
					msgArray.push("You requested info on **" + msg.channel.server.name + "**");
					msgArray.push("Server ID: `" + msg.channel.server.id + "`");
					msgArray.push("Owner: " + msg.channel.server.owner + " (id: `" + msg.channel.server.owner.id + "`)");
					msgArray.push("Region: `" + msg.channel.server.region + "`");
					msgArray.push("Icon: " + msg.channel.server.iconURL);
					bot.sendMessage(msg, msgArray);
					console.log('[info]', "Got info on " + msg.channel.server.name);
				} else { bot.sendMessage(msg, "Can't do that in a DM."); }
			}	
		}
	},
	"choose": {
		desc: "Makes a choice for you.",
		permLevel: 0,
		usage: "<option 1>, <option 2>, [option], [option]",
		process: function (bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, correctUsage("choose")); return;}
			var choices = suffix.split(", ");
			if (choices.length < 2) {
				bot.sendMessage(msg, correctUsage("choose"));
			} else {
				choice = Math.floor(Math.random() * (choices.length));
				bot.sendMessage(msg, "I picked " + choices[choice]);
			}
		}
	}
};

exports.commands = commands;
