/* global ServerSettings */
/* global talkedToTimes */
/* global commandsProcessed */
/// <reference path="../typings/main.d.ts" />
var config = require("./config.json");
var games = require("./games.json").games;
var version = require("../package.json").version;
var colors = require("./styles.js");
var db = require("./db.js");

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

var aliases = {
	"h": "help",
	"s": "stats", "stat": "stats",
	"play": "playing",
	"c": "clean",
	"p": "prune",
	"l": "leave", "leaves": "leave",
	"a": "announce", "ann": "announce",
	"change": "changelog", "logs": "changelog", "changelogs": "changelog",
	"rolec": "color", "rolecolor": "color",
	"gc": "givecolor", "setcolor": "givecolor",
	"rmcolor": "removecolor", "takecolor": "removecolor", "rc": "removecolor", "deletecolor": "removecolor",
	"config": "settings"
};

var commands = {
	"sql": {
		desc: "Query the PostgreSQL database",
		usage: "<query>",
		deleteCommand: false, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (msg.author.id == config.admin_id) { db.sql(bot, msg, suffix); }
		}
	},
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]", deleteCommand: true, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			var msgArray = [];
			if (!suffix) {
				msgArray.push("Use `" + config.mod_command_prefix + "help <command name>` to get info on a specific command.");
				msgArray.push("");
				msgArray.push("**Commands: **\n");
				Object.keys(commands).forEach(function(cmd) {
					if (commands[cmd].hasOwnProperty("shouldDisplay")) {
						if (commands[cmd].shouldDisplay) { msgArray.push("`" + config.mod_command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
					} else { msgArray.push("`" + config.mod_command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
				});
				bot.sendMessage(msg.author, msgArray);
			} else { //if user wants info on a command
				if (commands.hasOwnProperty(suffix)) {
					msgArray.push("**" + config.mod_command_prefix + "" + suffix + ": **" + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { msgArray.push("**Usage:** `" + config.mod_command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { msgArray.push("**Cooldown:** " + commands[suffix].cooldown + " seconds"); }
					if (commands[suffix].hasOwnProperty("deleteCommand")) { msgArray.push("*This command will delete the message that activates it*"); }
					bot.sendMessage(msg, msgArray);
				} else { bot.sendMessage(msg, "Command `" + suffix + "` not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			}
		}
	},
	"stats": {
		desc: "Get the stats of the bot",
		usage: "", cooldown: 30, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.author.id == config.admin_id || msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageChannel")) {
				var msgArray = [];
				msgArray.push("```");
				msgArray.push("Uptime (may be inaccurate): " + (Math.round(bot.uptime / (1000 * 60 * 60))) + " hours, " + (Math.round(bot.uptime / (1000 * 60)) % 60) + " minutes, and " + (Math.round(bot.uptime / 1000) % 60) + " seconds.");
				msgArray.push("Connected to " + bot.servers.length + " servers with " + bot.channels.length + " channels. I'm aware of " + bot.users.length + " users.");
				msgArray.push("Memory Usage: " + Math.round(process.memoryUsage().rss / 1024 / 1000) + "MB");
				msgArray.push("Running BrussellBot v" + version);
				msgArray.push("Commands this session: " + commandsProcessed + " + " + talkedToTimes + " cleverbot");
				msgArray.push("```");
				bot.sendMessage(msg, msgArray);
			} else { bot.sendMessage(msg, "Only server admins/mods can do this.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"playing": {
		desc: "Allows the bot owner to set the game.",
		usage: "[game]", cooldown: 10, shouldDisplay: false, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.author.id == config.admin_id) {
				if (!suffix) { bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
				} else { bot.setPlayingGame(suffix); if (config.debug) { console.log(colors.cDebug(" DEBUG ") + msg.author.username + " changed the playing status to: " + suffix); } }
			} else { bot.setPlayingGame("with " + msg.author.username); }
		}
	},
	"clean": {
		desc: "Cleans the specified number of bot messages from the channel.",
		usage: "<number of bot messages 1-100>",
		cooldown: 10, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix)) { //if suffix has digits
				if (msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageMessages") || msg.author.id == config.admin_id) {
					bot.getChannelLogs(msg.channel, 100, function(error, messages) {
						if (error) { console.log(colors.cWarn(" WARN ") + "Something went wrong while fetching logs."); return; }
						if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Cleaning bot messages..."); }
						var todo = parseInt(suffix),
						delcount = 0;
						for (var i = 0; i < 100; i++) {
							if (todo <= 0 || i == 99) {
								bot.sendMessage(msg, msg.author.username + " 👍");
								return;
							}
							if (messages[i].author == bot.user) {
								bot.deleteMessage(messages[i]);
								delcount++;
								todo--;
							}
						}
						if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Done! Deleted " + delcount + " messages."); }
					});
				} else { bot.sendMessage(msg, "⚠ You must have permission to manage messages in this channel", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			} else { bot.sendMessage(msg, correctUsage("clean"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"prune": {
		desc: "Cleans the specified number of messages from the channel.",
		usage: "<1-100> [if it contains this] | <1-100> user <username> | <1-100> images",
		cooldown: 10, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix.split(" ")[0])) {
				if (!msg.channel.isPrivate) {
					if (msg.channel.permissionsOf(msg.author).hasPermission("manageMessages") || msg.author.id == config.admin_id) {
						if (msg.channel.permissionsOf(bot.user).hasPermission("manageMessages")) {
							bot.getChannelLogs(msg.channel, 100, function(error, messages) {
								if (error) { console.log(colors.cWarn(" WARN ") + "Something went wrong while fetching logs."); return; }
								if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Pruning messages..."); }
								var todo = parseInt(suffix.split(" ")[0]);
								var hasTerm = false, hasUser = false, hasImages = false;
								var term = "", username = "";
								if (suffix.split(" ").length > 1 && suffix.split(" ")[1].toLowerCase() !== "user" && suffix.split(" ")[1].toLowerCase() !== "images") { todo += 1; hasTerm = true; term = suffix.substring(suffix.indexOf(" ") + 1);
								} else if (suffix.split(" ").length > 2 && suffix.split(" ")[1].toLowerCase() === "user") {
									if (msg.mentions.length < 1) { hasUser = true; username = suffix.replace(/\d+ user /, "").toLowerCase();
									} else if (msg.mentions.length > 1) { bot.sendMessage(msg, "⚠ Can only prune one user at a time", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); return;
									} else { username = msg.mentions[0].username.toLowerCase(); hasUser = true; }
								} else if (suffix.split(" ").length == 2 && suffix.split(" ")[1].toLowerCase() === "images") { hasImages = true;
								} else if (suffix.split(" ").length > 1) { bot.sendMessage(msg, correctUsage("prune"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); return; }
								var delcount = 0;
								for (var i = 0; i < 100; i++) {
									if (todo <= 0 || i == 99) {
										bot.sendMessage(msg, msg.author.username + " 👍");
										return;
									}
									if (hasTerm && messages[i].content.indexOf(term) > -1) {
										bot.deleteMessage(messages[i]);
										delcount++;
										todo--;
									} else if (hasUser && messages[i].author.username.toLowerCase() == username) {
										bot.deleteMessage(messages[i]);
										delcount++;
										todo--;
									} else if (hasImages && messages[i].attachments && JSON.stringify(messages[i].attachments) !== "[]") {
										bot.deleteMessage(messages[i]);
										delcount++;
										todo--;
									} else if (!hasTerm && !hasUser && !hasImages) {
										bot.deleteMessage(messages[i]);
										delcount++;
										todo--;
									}
								}
								if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Done! Deleted " + delcount + " messages."); }
							});
						} else { bot.sendMessage(msg, "⚠ I don't have permission to delete messages.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
					} else { bot.sendMessage(msg, "⚠ You must have permission to manage messages in this channel", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				} else { bot.sendMessage(msg, "⚠ Can't do that in a DM"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }; }
			} else { bot.sendMessage(msg, correctUsage("prune"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"leave": {
		desc: "Leaves the server.",
		usage: "", deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.channel.server) {
				if (msg.channel.permissionsOf(msg.author).hasPermission("kickMembers") || msg.author.id == config.admin_id) {
					db.removeFromDB(msg.channel.server.id);
					bot.sendMessage(msg, "It's not like I wanted to be here or anything, *baka*").then(
					msg.channel.server.leave());
					console.log(colors.cYellow("I've left a server on request of " + msg.sender.username + ". ") + "I'm only in " + bot.servers.length + " servers now.");
				} else {
					bot.sendMessage(msg, "You can't tell me what to do! *(You need permission to kick users in this channel)*");
					console.log(colors.cYellow("Non-privileged user: " + msg.sender.username) + " tried to make me leave a server.");
				}
			} else { bot.sendMessage(msg, "⚠ I can't leave a DM.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"announce": {
		desc: "Send a PM to all users in a server. Admin only",
		deleteCommand: false, usage: "<message>", cooldown: 1,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, "You must specify a message to announce", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (msg.channel.isPrivate && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You can't do this outside of a server",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); return; }); }
			if (!msg.channel.isPrivate) { if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "Server admins only", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; } }
			if (!msg.channel.isPrivate) {
				if (/^\d+$/.test(suffix)) {
					var index = confirmCodes.indexOf(parseInt(suffix));
					if (index == -1) { bot.sendMessage(msg, "Code not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					bot.sendMessage(msg, "Announcing to all users, this may take a while...");
					var loopIndex = 0;
					function annLoopS() {
						if (loopIndex >= msg.channel.server.members.length) { clearInterval(annTimerS); return; }
						bot.sendMessage(msg.channel.server.members[loopIndex], "📣 " + announceMessages[index] + " - from " + msg.author + " on " + msg.channel.server.name);
						loopIndex++;
					}
					var annTimerS = setInterval(() => { annLoopS() }, 1100);
					delete confirmCodes[index];
					if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Announced \"" + announceMessages[index] + "\" to members of " + msg.channel.server.name); }
				} else {
					announceMessages.push(suffix);
					var code = Math.floor(Math.random() * 100000);
					confirmCodes.push(code);
					bot.sendMessage(msg, "⚠ This will send a message to **all** users in this server. If you're sure you want to do this say `" + config.mod_command_prefix + "announce " + code + "`");
				}
			} else if (msg.channel.isPrivate && msg.author.id == config.admin_id) {
				if (/^\d+$/.test(suffix)) {
					var index = confirmCodes.indexOf(parseInt(suffix));
					if (index == -1) { bot.sendMessage(msg, "Code not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					bot.sendMessage(msg, "Announcing to all servers, this may take a while...");
					var loopIndex = 0;
					function annLoop() {
						if (loopIndex >= bot.servers.length) { clearInterval(annTimer); return; }
						bot.sendMessage(bot.servers[loopIndex].defaultChannel, "📣 " + announceMessages[index] + " - from your lord and savior " + msg.author.username);
						loopIndex++;
					}
					var annTimer = setInterval(() => { annLoop() }, 1100);
					delete confirmCodes[index];
					if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Announced \"" + announceMessages[index] + "\" to all servers"); }
				} else {
					announceMessages.push(suffix);
					var code = Math.floor(Math.random() * 100000);
					confirmCodes.push(code);
					bot.sendMessage(msg, "⚠ This will send a message to **all** servers where I can speak in general. If you're sure you want to do this say `" + config.mod_command_prefix + "announce " + code + "`");
				}
			}
		}
	},
	"changelog": {
		desc: "See recent changes to the bot",
		deleteCommand: true, usage: "", cooldown: 30,
		process: function(bot, msg, suffix) {
			var chanelogChannel = bot.channels.get("id", "135527608564580353");
			if (!chanelogChannel) { bot.sendMessage(msg, "The bot is not in the BrussellBot Official Server", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else {
				bot.getChannelLogs(chanelogChannel, 2, function(err, messages) {
					if (err) { bot.sendMessage(msg, "Error getting changelogs: " + err); return; }
					var msgArray = ["*Changelogs:*"];
					msgArray.push("━━━━━━━━━━━━━━━━━━━");
					msgArray.push(messages[1]);
					msgArray.push("━━━━━━━━━━━━━━━━━━━");
					msgArray.push(messages[0]);
					bot.sendMessage(msg, msgArray);
				});
			}
		}
	},
	"color": {
		desc: "Change a role's color",
		usage: "<role name> <color in hex>",
		deleteCommand: true, cooldown: 5,
		process: function(bot, msg, suffix) {
			if (/^(.*) #?[A-F0-9]{6}$/i.test(suffix)) {
				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Must be done in a server!",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You can't edit roles!",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "I can't edit roles!",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				var role = msg.channel.server.roles.get("name", suffix.replace(/ #?[a-f0-9]{6}/i, ""));
				if (role) { bot.updateRole(role, {color: parseInt(suffix.replace(/(.*) #?/, ""), 16)}); bot.sendMessage(msg, msg.author.username + " 👍");
				} else { bot.sendMessage(msg, "Role \"" + suffix.replace(/ #?[a-f0-9]{6}/i, "") + "\" not found",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			} else { bot.sendMessage(msg, correctUsage("color"),function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"givecolor": {
		desc: "Give a user a color",
		usage: "<@users> <color as hex>",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); return; }); }
			if (!/^<@(.*)> #?[a-f0-9]{6}$/i.test(suffix)) { bot.sendMessage(msg, correctUsage("givecolor"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You can't edit roles!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "I can't manage roles!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (msg.mentions.length < 1) { bot.sendMessage(msg, "You must mention the users you want to change the color of!",(erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			var role = msg.channel.server.roles.get("name", "#" + suffix.replace(/(.*) #?/, "").toLowerCase());
			var roleExists = false;
			if (role) { roleExists = true; }
			msg.mentions.map((user) => {
				msg.channel.server.rolesOfUser(user).map((r) => {
					if (/^#[a-f0-9]{6}$/i.test(r.name)) {
						if (r.name != "#" + suffix.replace(/(.*) #?/, "").toLowerCase()) { bot.removeMemberFromRole(user, r, () => {setTimeout(() => {if (msg.channel.server.usersWithRole(r).length < 1) { bot.deleteRole(r, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e,function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); } }) }},500);}); }
					}
				});
				if (roleExists) {
					bot.addMemberToRole(user, role, (e) => { if (e) { bot.sendMessage(msg, "Error giving member role: " + e); return; } });
					bot.sendMessage(msg, msg.author.username + " 👍");
				} else {
					msg.channel.server.createRole({color: parseInt(suffix.replace(/(.*) #?/, ""), 16), hoist: false, permissions: [], name: "#" + suffix.replace(/(.*) #?/, "").toLowerCase()}, (e, rl) => {
						if (e) { bot.sendMessage(msg, "Error creating role: " + e); return; }
						role = rl;
						roleExists = true;
						bot.addMemberToRole(user, role, (e) => { if (e) { bot.sendMessage(msg, "Error giving member role: " + e); return; } });
						bot.sendMessage(msg, msg.author.username + " 👍");
					});
				}
			});
		}
	},
	"removecolor": {
		desc: "Clean unused colors | Remove a user's color | Remove a color",
		usage: "clean | @users | #hexcolor",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); return; }); }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You can't edit roles!",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "I can't manage roles!",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (msg.mentions.length > 0) {
				msg.mentions.map((user) => {
					msg.channel.server.rolesOfUser(user).map((r) => {
						if (/^#[a-f0-9]{6}$/.test(r.name)) {
							bot.removeMemberFromRole(user, r);
							setTimeout(() => {if (msg.channel.server.usersWithRole(r).length < 1) { bot.deleteRole(r, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e,function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); } }); }},500);
						}
					});
				});
				bot.sendMessage(msg, msg.author.username + " 👍");
			} else if (/^#?[a-f0-9]{6}$/i.test(suffix.trim())) {
				var role = msg.channel.server.roles.get("name", "#" + suffix.trim().replace(/(.*) #?/, "").toLowerCase());
				if (!role) { bot.sendMessage(msg, "Color not found",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				bot.deleteRole(role, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e,function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; } });
				bot.sendMessage(msg, msg.author.username + " 👍");
			} else if (suffix.trim() == "clean") {
				msg.channel.server.roles.map((role) => {
					if (/^#?[a-f0-9]{6}$/.test(role.name)) {
						if (msg.channel.server.usersWithRole(role).length < 1) { bot.deleteRole(role, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e,function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); } }); }
					}
				});
				bot.sendMessage(msg, msg.author.username + " 👍");
			} else { bot.sendMessage(msg, correctUsage("removecolor"),function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"settings": {
		desc: "(OPEN-BETA) Server settings. Read about them here: **http://brussell98.github.io/bot/serversettings.html**",
		usage: "<enable|disable|welcomemsg|init> <command|message>",
		deleteCommand: false,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); return; }); }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You must have permission to manage the server!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!suffix) { bot.sendMessage(msg, correctUsage("settings"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (suffix.startsWith("enable")) {

				if (!ServerSettings.hasOwnProperty(msg.channel.server.id)) { bot.sendMessage(msg, "You need to initialize per-server settings on this server! Go to this page to generate the comamnd: **http://brussell98.github.io/bot/serversettings.html**"); return; }
				suffix = suffix.split(" ");
				if (suffix.length == 1) { bot.sendMessage(msg, "You must specify a setting to enable", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				suffix.shift();
				if (suffix[0].toLowerCase() == "deletecmds") {
					if (ServerSettings[msg.channel.server.id].deletecmds == false) {
						ServerSettings[msg.channel.server.id].deletecmds = true;
						db.updateServerDB(msg.channel.server.id, () => { bot.sendMessage(msg, msg.author.username + " 👍"); });
					} else { bot.sendMessage(msg, "__Delete Commands__ is already enabled!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				} else if (suffix[0].toLowerCase() == "banalerts") {
					if (ServerSettings[msg.channel.server.id].banalerts == false) {
						ServerSettings[msg.channel.server.id].banalerts = true;
						db.updateServerDB(msg.channel.server.id, () => { bot.sendMessage(msg, msg.author.username + " 👍"); });
					} else { bot.sendMessage(msg, "__Ban Alerts__ are already enabled!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				} else if (suffix[0].toLowerCase() == "namechanges") {
					if (ServerSettings[msg.channel.server.id].namechanges == false) {
						ServerSettings[msg.channel.server.id].namechanges = true;
						db.updateServerDB(msg.channel.server.id, () => { bot.sendMessage(msg, msg.author.username + " 👍"); });
					} else { bot.sendMessage(msg, "__Name Change Alerts__ are already enabled!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				} else if (suffix[0].toLowerCase() == "welcomemsg") {
					if (ServerSettings[msg.channel.server.id].welcomemsg == "false") {
						ServerSettings[msg.channel.server.id].welcomemsg = "Hi $USER$! Welcome to $SERVER$";
						bot.sendMessage(msg, "__Welcome Messages__ enabled! Use `" + config.mod_command_prefix + "settings welcomemsg <message>` to edit the message");
						db.updateServerDB(msg.channel.server.id, () => { bot.sendMessage(msg, msg.author.username + " 👍"); });
					} else { bot.sendMessage(msg, "__Welcome Messages__ are already enabled!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				}

			} else if (suffix.startsWith("disable")) {

				if (!ServerSettings.hasOwnProperty(msg.channel.server.id)) { bot.sendMessage(msg, "You need to initialize per-server settings on this server! Go to this page to generate the comamnd: **http://brussell98.github.io/bot/serversettings.html**"); return; }
				suffix = suffix.split(" ");
				if (suffix.length == 1) { bot.sendMessage(msg, "You must specify a setting to disable", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				suffix.shift();
				if (suffix[0].toLowerCase() == "deletecmds") {
					if (ServerSettings[msg.channel.server.id].deletecmds == true) {
						ServerSettings[msg.channel.server.id].deletecmds = false;
						db.updateServerDB(msg.channel.server.id, () => { bot.sendMessage(msg, msg.author.username + " 👍"); });
					} else { bot.sendMessage(msg, "__Delete Commands__ is already disabled!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				} else if (suffix[0].toLowerCase() == "banalerts") {
					if (ServerSettings[msg.channel.server.id].banalerts == true) {
						ServerSettings[msg.channel.server.id].banalerts = false;
						db.updateServerDB(msg.channel.server.id, () => { bot.sendMessage(msg, msg.author.username + " 👍"); });
					} else { bot.sendMessage(msg, "__Ban Alerts__ are already disabled!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				} else if (suffix[0].toLowerCase() == "namechanges") {
					if (ServerSettings[msg.channel.server.id].namechanges == true) {
						ServerSettings[msg.channel.server.id].namechanges = false;
						db.updateServerDB(msg.channel.server.id, () => { bot.sendMessage(msg, msg.author.username + " 👍"); });
					} else { bot.sendMessage(msg, "__Name Change Alerts__ are already disabled!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				} else if (suffix[0].toLowerCase() == "welcomemsg") {
					if (ServerSettings[msg.channel.server.id].welcomemsg != "false") {
						ServerSettings[msg.channel.server.id].welcomemsg = "false";
						db.updateServerDB(msg.channel.server.id, () => { bot.sendMessage(msg, msg.author.username + " 👍"); });
					} else { bot.sendMessage(msg, "__Welcome Messages__ are already disabled!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				}

			} else if (suffix.startsWith("welcomemsg")) {

				if (!ServerSettings.hasOwnProperty(msg.channel.server.id)) { bot.sendMessage(msg, "You need to initialize per-server settings on this server! Go to this page to generate the comamnd: **http://brussell98.github.io/bot/serversettings.html**"); return; }
				if (ServerSettings[msg.channel.server.id].welcomemsg == "false") { bot.sendMessage(msg, "You need to enable welcome messages first!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (/^welcomemsg .*/i.test(suffix)) {
					suffix = suffix.substring(11);
					//should probably filter some stuff out
					ServerSettings[msg.channel.server.id].welcomemsg = suffix;
					db.updateServerDB(msg.channel.server.id, () => { bot.sendMessage(msg, msg.author.username + " 👍"); });
				} else { bot.sendMessage(msg, "You need to provide a welcome message!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }

			} else if (suffix.startsWith("init")) {

				if (!ServerSettings.hasOwnProperty(msg.channel.server.id)) {
					if (/^init (true|false):::(true|false):::(true|false):::.*/i.test(suffix) && suffix.split(":::").length == 4) {
						suffix = suffix.split(":::");
						suffix[0] = suffix[0].replace(/^init /i, "");
						var stngs = {
										"deletecmds": (suffix[1] == "true") ? true : false,
										"welcomemsg": (suffix[3] == "false") ? "false" : suffix[3],
										"banalerts": (suffix[0] == "true") ? true : false,
										"namechanges": (suffix[2] == "true") ? true : false
									};
						ServerSettings[msg.channel.server.id] = stngs;
						db.addToDB(msg.channel.server.id, () => { bot.sendMessage(msg, "Server added to settings database with the following settings:\n**Delete Commands:** " + ServerSettings[msg.channel.server.id].deletecmds + "\n**Ban Alerts:** " + ServerSettings[msg.channel.server.id].banalerts + "\n**Name Change Alerts:** " + ServerSettings[msg.channel.server.id].namechanges + "\n**Welcome Message:** " + ServerSettings[msg.channel.server.id].welcomemsg); });
					} else { bot.sendMessage(msg, "Your init command isn't formatted correctly! Go here to generate one: **http://brussell98.github.io/bot/serversettings.html**", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				} else { bot.sendMessage(msg, "This server is already in the database", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }

			} else { bot.sendMessage(msg, correctUsage("settings"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	}
}

exports.commands = commands;
exports.aliases = aliases;
