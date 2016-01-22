var config = require("./config.json");
var games = require("./games.json").games;
var version = require("../package.json").version;
var fs = require('fs');
var colors = require('./styles.js');

var confirmCodes = []; //stuff for announce
var announceMessages = [];

/*
=====================
Functions
=====================
*/

function correctUsage(cmd) {
	var msg = "Usage: `" + config.mod_command_prefix + "" + cmd + " " + commands[cmd].usage + "`";
	return msg;
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
		deleteCommand: true,
		shouldDisplay: false,
		process: function(bot, msg, suffix) {
			var msgArray = [];
			if (!suffix){
				msgArray.push("Use `" + config.mod_command_prefix + "help <command name>` to get info on a specific command.");
				msgArray.push("");
				msgArray.push("**Commands: **\n");
				Object.keys(commands).forEach(function(cmd){
				if (commands[cmd].hasOwnProperty("shouldDisplay")) {
						if (commands[cmd].shouldDisplay) { msgArray.push("`" + config.mod_command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
					} else { msgArray.push("`" + config.mod_command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
				});
				bot.sendMessage(msg.author, msgArray);
			} else { //if user wants info on a command
				if (commands.hasOwnProperty(suffix)){
					msgArray.push("**" + config.mod_command_prefix + "" + suffix + ": **" + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { msgArray.push("**Usage:** `" + config.mod_command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { msgArray.push("**Cooldown:** " + commands[suffix].cooldown + " seconds"); }
					if (commands[suffix].hasOwnProperty("deleteCommand")) { msgArray.push("*This command will delete the message that activates it*"); }
					bot.sendMessage(msg, msgArray);
				} else { bot.sendMessage(msg, "Command `" + suffix + "` not found.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			}
		}
	},
	"stats": {
		desc: "Get the stats of the bot",
		usage: "[-ls (list servers (DM only))] ",
		cooldown: 30,
		deleteCommand: true,
		process: function(bot, msg, suffix, commandsProcessed, talkedToTimes) {
			if (msg.author.id == config.admin_id || msg.channel.isPrivate || msg.author.id == msg.channel.server.owner.id) {
				var msgArray = [];
				msgArray.push("```");
				msgArray.push("Uptime: " + (Math.round(bot.uptime / (1000 * 60 * 60))) + " hours, " + (Math.round(bot.uptime / (1000 * 60)) % 60) + " minutes, and " + (Math.round(bot.uptime / 1000) % 60) + " seconds.");
				msgArray.push("Connected to " + bot.servers.length + " servers and " + bot.channels.length + " channels.");
				msgArray.push("Serving " + bot.users.length + " users.");
				msgArray.push("Memory Usage: " + Math.round(process.memoryUsage().rss/1024/1000)+"MB");
				msgArray.push("Running BrussellBot v" + version);
				msgArray.push("Commands processed this session: " + commandsProcessed);
				msgArray.push("Users talked to "+bot.user.username+" "+talkedToTimes+" times");
				msgArray.push("```");
				bot.sendMessage(msg, msgArray);

				if (suffix.indexOf("-ls") != -1 && msg.channel.isPrivate) { //if user wants a list of servers NEED TO PAGINATE AND FORMAT BETTER
					var svrArray = [];
					for (svrObj of bot.servers) { svrArray.push("`"+svrObj.name+": C: "+svrObj.channels.length+", U: "+svrObj.members.length+"`"); }
					bot.sendMessage(msg, svrArray);

				}
			} else { bot.sendMessage(msg, "Only server owners can do this.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"playing": {
		desc: "Allows the bot owner to set the game.",
		usage: "[game]",
		cooldown: 10,
		shouldDisplay: false,
		deleteCommand: true,
		process: function (bot, msg, suffix) {
			if (msg.author.id == config.admin_id) {
				if (!suffix) { bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]); }
				else { bot.setPlayingGame(suffix); if (config.debug) { console.log(colors.cDebug(" DEBUG ")+msg.author.username + " changed the playing status to: "+suffix); } }
			} else { bot.setPlayingGame("with "+msg.author.username); }
		}
	},
	"clean": {
		desc: "Cleans the specified number of bot messages from the channel.",
		usage: "<number of bot messages 1-100>",
		cooldown: 10,
		deleteCommand: true,
		process: function (bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix)) { //if suffix has digits
				if (msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageMessages") || msg.author.id == config.admin_id) {
					bot.getChannelLogs(msg.channel, 100, function (error, messages) {
						if (error) { console.log(colors.cWarn(" WARN ")+"Something went wrong while fetching logs."); return; }
						else {
							if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Cleaning bot messages..."); }
							var todo = parseInt(suffix),
							delcount = 0;
							for (msg1 of messages) {
								if (msg1.author == bot.user) {
									bot.deleteMessage(msg1);
									delcount++;
									todo--;
								}
								if (todo == 0) {
									if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Done! Deleted " + delcount + " messages."); }
									bot.stopTyping(msg.channel);
									return;
								}
							}
							if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Done! Deleted " + delcount + " messages."); }
						}
					});
				} else { bot.sendMessage(msg, ":warning: You must have permission to manage messages in this channel", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			} else { bot.sendMessage(msg, correctUsage("clean"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"prune": {
		desc: "Cleans the specified number of messages from the channel.",
		usage: "<number of messages 1-100> [if it contains this]",
		cooldown: 10,
		deleteCommand: true,
		process: function (bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix.split(" ")[0])) {
				if (!msg.channel.isPrivate) {
					if (msg.channel.permissionsOf(msg.author).hasPermission("manageMessages")) {
						if (msg.channel.permissionsOf(bot.user).hasPermission("manageMessages")) {
							bot.getChannelLogs(msg.channel, 100, function (error, messages) {
								if (error) { console.log(colors.cWarn(" WARN ")+"Something went wrong while fetching logs."); return; }
								else {
									if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Pruning messages..."); }
									var todo = parseInt(suffix);
									var hasTerm = false;
									var term = "";
									if (suffix.split(" ").length > 1) { todo += 1; hasTerm = true; term = suffix.substring(suffix.indexOf(" ") + 1); }
									var delcount = 0;
									for (cMsg of messages) {
										if (hasTerm && cMsg.content.indexOf(term) > -1) {
											bot.deleteMessage(cMsg);
											delcount++;
											todo--;
										} else if (!hasTerm) {
											bot.deleteMessage(cMsg);
											delcount++;
											todo--;
										}
										if (todo == 0 || delcount == 100) {
											return;
										}
									}
									if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Done! Deleted " + delcount + " messages."); }
								}
							});
						} else { bot.sendMessage(msg, ":warning: I don't have permission to delete messages.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
					} else { bot.sendMessage(msg, ":warning: You must have permission to manage messages in this channel", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				} else { bot.sendMessage(msg, ":warning: Can't do that in a DM"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }; }
			} else { bot.sendMessage(msg, correctUsage("prune"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"leaves": {
		desc: "Leaves the server.",
		usage: "",
		deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.channel.server) {
				if (msg.channel.permissionsOf(msg.author).hasPermission("kickMembers") || msg.author.id == config.admin_id) {
					bot.sendMessage(msg, "It's not like I want to be here or anything, baka").then(
					bot.leaveServer(msg.channel.server));
					console.log(colors.cYellow("I've left a server on request of " + msg.sender.username + ". ")+"I'm only in " + bot.servers.length + " servers now.");
				} else {
					bot.sendMessage(msg, "You can't tell me what to do! (You need permission to kick users in this channel)");
					console.log(colors.cYellow("Non-privileged user: " + msg.sender.username)+" tried to make me leave a server.");
				}
			} else { bot.sendMessage(msg, ":warning: I can't leave a DM.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"announce": {
		desc: "Send a DM to all users in the server. Admins only.",
		deleteCommand: false,
		usage: "<message>",
		cooldown: 1,
		process: function (bot, msg, suffix) {
			if (suffix) {
				if (msg.author.id == config.admin_id && msg.channel.isPrivate) { //bot owner to all servers
					if (/^\d+$/.test(suffix)) { //if confirm code
						for (var i = 0; i < confirmCodes.length; i++) {
							if (confirmCodes[i] != suffix) {
								if (i == confirmCodes.length - 1) { bot.sendMessage(msg, "Confirmation code not found", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); continue; }
								else { continue; }
							}
							bot.sendMessage(msg, "Announcing to all servers...");
							bot.servers.forEach(function (ser) {
								if (ser.members.length <= 500) { //only if less than 501 members
									setTimeout(function () {
										bot.sendMessage(ser.defaultChannel, ":mega: " + announceMessages[i] + " - " + msg.author.username + " *(bot owner)*");
									}, 1000); //1 message per second
								}
							});
							if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Announced \"" + announceMessages[i] + "\" to servers"); }
							return;
						}
					} else {
						announceMessages.push(suffix);
						var code = Math.floor(Math.random() * 999999999);
						confirmCodes.push(Math.floor(code));
						bot.sendMessage(msg, ":warning: This will send a private message to **all** of the servers I'm in. If you're sure you want to do this say `"+config.mod_command_prefix+"announce "+code+"`");
					}
				} else if (!msg.channel.isPrivate && msg.channel.permissionsOf(msg.author).hasPermission("manageServer")) {
					if (/^\d+$/.test(suffix)) {
						for (var i = 0; i < confirmCodes.length; i++) {
							if (confirmCodes[i] != suffix) {
								if (i == confirmCodes.length - 1) { bot.sendMessage(msg, "Confirmation code not found", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); continue; }
								else { continue; }
							}
							bot.sendMessage(msg, "Announcing to all users, this may take a while...");
							msg.channel.server.members.forEach(function (usr) {
								setTimeout(function () {
									bot.sendMessage(usr, ":mega: " + announceMessages[i] + " - from " + msg.author + " on " + msg.channel.server.name);
								}, 1000);
							});
							if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Announced \"" + announceMessages[i] + "\" to members of "+msg.channel.server.name); }
							return;
						}
					} else {
						announceMessages.push(suffix);
						var code = Math.floor(Math.random() * 999999999);
						confirmCodes.push(Math.floor(code));
						bot.sendMessage(msg, ":warning: This will send a private message to **all** members of this server. If you're sure you want to do this say `"+config.mod_command_prefix+"announce "+code+"`");
					}
				} else { bot.sendMessage(msg, ":warning: Server admins only", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			} else { bot.sendMessage(msg, ":warning: You must specify a message to announce", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"changelog": {
		desc: "See recent changes to the bot",
		deleteCommand: true,
		usage: "",
		cooldown: 30,
		process: function(bot, msg, suffix) {
			var chanelogChannel = bot.channels.get("id", '135527608564580353');
			if (!chanelogChannel) { bot.sendMessage(msg, "The bot is not in the BrussellBot Official Server", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			else {
				bot.getChannelLogs(chanelogChannel, 2, function (err, messages) {
					if (err) { bot.sendMessage(msg, "Error getting changelogs: "+err); return; }
					var msgArray = ["*Changelogs:*"];
					for (var i = messages.length - 1; i >= 0; i--) {
						msgArray.push("**----------------------------------**");
						msgArray.push(messages[i]);
						if (i == 0) { bot.sendMessage(msg, msgArray); }
					}
				});
			}
		}
	}
}

exports.commands = commands;
