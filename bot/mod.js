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

function correctUsage(cmd, user) {
	return (commands.hasOwnProperty(cmd)) ? user.replace(/@/g, '') + ", the correct usage is: `" + config.mod_command_prefix + "" + cmd + " " + commands[cmd].usage + "`": "This should display the correct usage but the bot maker made a mistake";
}

function unMute(bot, msg, users, time, role) {
	setTimeout(() => {
		users.map((user) => {
			if (msg.channel.server.members.get("name", user.username) && msg.channel.server.roles.get("name", role.name) && bot.memberHasRole(user, role)) {
				bot.removeMemberFromRole(user, role);
			}
		});
	}, time * 60000);
}

/*
=====================
Commands
=====================
*/

var aliases = {
	"h": "help", "commands": "help",
	"s": "stats", "stat": "stats", "status": "stats",
	"play": "playing",
	"c": "clean",
	"p": "prune",
	"l": "leave", "leaves": "leave",
	"a": "announce", "ann": "announce",
	"change": "changelog", "logs": "changelog", "changelogs": "changelog",
	"rolec": "color", "rolecolor": "color",
	"gc": "givecolor", "setcolor": "givecolor",
	"rmcolor": "removecolor", "takecolor": "removecolor", "rc": "removecolor", "deletecolor": "removecolor",
	"config": "settings", "set": "settings"
};

var commands = {
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]", deleteCommand: true, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			var toSend = [];
			if (!suffix) {
				toSend.push("Use `" + config.mod_command_prefix + "help <command name>` to get info on a specific command.");
				toSend.push("");
				toSend.push("**Commands: **\n");
				Object.keys(commands).forEach(function(cmd) {
					if (commands[cmd].hasOwnProperty("shouldDisplay")) {
						if (commands[cmd].shouldDisplay) { toSend.push("`" + config.mod_command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
					} else { toSend.push("`" + config.mod_command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
				});
				bot.sendMessage(msg.author, toSend);
			} else {
				if (commands.hasOwnProperty(suffix)) {
					toSend.push("**" + config.mod_command_prefix + "" + suffix + ": **" + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { toSend.push("**Usage:** `" + config.mod_command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { toSend.push("**Cooldown:** " + commands[suffix].cooldown + " seconds"); }
					if (commands[suffix].hasOwnProperty("deleteCommand")) { toSend.push("*This command will delete the message that activates it*"); }
					bot.sendMessage(msg, toSend);
				} else { bot.sendMessage(msg, "Command `" + suffix + "` not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			}
		}
	},
	"stats": {
		desc: "Get the stats of the bot",
		usage: "", cooldown: 30, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.author.id == config.admin_id || msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageChannel")) {
				var toSend = [];
				toSend.push("```");
				toSend.push("Uptime (may be inaccurate): " + (Math.round(bot.uptime / (1000 * 60 * 60))) + " hours, " + (Math.round(bot.uptime / (1000 * 60)) % 60) + " minutes, and " + (Math.round(bot.uptime / 1000) % 60) + " seconds.");
				toSend.push("Connected to " + bot.servers.length + " servers with " + bot.channels.length + " channels. I'm aware of " + bot.users.length + " users.");
				toSend.push("Memory Usage: " + Math.round(process.memoryUsage().rss / 1024 / 1000) + "MB");
				toSend.push("Running BrussellBot v" + version);
				toSend.push("Commands this session: " + commandsProcessed + " + " + talkedToTimes + " cleverbot");
				toSend.push("```");
				bot.sendMessage(msg, toSend);
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
					bot.getChannelLogs(msg.channel, 100, (error, messages) => {
						if (error) { console.log(colors.cWarn(" WARN ") + "Something went wrong while fetching logs."); return; }
						if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Cleaning bot messages..."); }
						var todo = parseInt(suffix),
						delcount = 0;
						for (var i = 0; i < 100; i++) {
							if (todo <= 0 || i == 99) {
								bot.sendMessage(msg, "Cleaned up " + delcount + " of my messages", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
								if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Done! Deleted " + delcount + " messages."); }
								return;
							}
							if (messages[i].author == bot.user) {
								bot.deleteMessage(messages[i]);
								delcount++;
								todo--;
							}
						}
					});
				} else { bot.sendMessage(msg, "⚠ You must have permission to manage messages in this channel", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			} else { bot.sendMessage(msg, correctUsage("clean", msg.author.username), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"prune": {
		desc: "Cleans the specified number of messages from the channel.",
		usage: "<1-100> [if it contains this] | <1-100> user <username> | <1-100> images",
		cooldown: 10, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix.split(" ")[0]) && suffix.split(" ")[0].length < 4) {
				if (!msg.channel.isPrivate) {
					if (msg.channel.permissionsOf(msg.author).hasPermission("manageMessages") || msg.author.id == config.admin_id) {
						if (msg.channel.permissionsOf(bot.user).hasPermission("manageMessages")) {
							bot.getChannelLogs(msg.channel, 100, { "before": msg }, (error, messages) => {
								if (error) { console.log(colors.cWarn(" WARN ") + "Something went wrong while fetching logs."); return; }
								if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Pruning messages..."); }
								var todo = parseInt(suffix.split(" ")[0]);
								var hasTerm = false, hasUser = false, hasImages = false;
								var term = "", username = "";
								if (suffix.split(" ").length > 1 && suffix.split(" ")[1].toLowerCase() !== "user" && suffix.split(" ")[1].toLowerCase() !== "images" && suffix.split(" ")[1].toLowerCase() !== "image") { hasTerm = true; term = suffix.substring(suffix.indexOf(" ") + 1);
								} else if (suffix.split(" ").length > 2 && suffix.split(" ")[1].toLowerCase() === "user") {
									if (msg.mentions.length < 1) { hasUser = true; username = suffix.replace(/\d+ user /, "").toLowerCase();
									} else if (msg.mentions.length > 1) { bot.sendMessage(msg, "⚠ Can only prune one user at a time", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); return;
									} else { username = msg.mentions[0].username.toLowerCase(); hasUser = true; }
								} else if (suffix.split(" ").length == 2 && (suffix.split(" ")[1].toLowerCase() === "images" || suffix.split(" ")[1].toLowerCase() === "image")) { hasImages = true;
								} else if (suffix.split(" ").length > 1) { bot.sendMessage(msg, correctUsage("prune", msg.author.username), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); return; }
								var delcount = 0;
								for (var i = 0; i < 100; i++) {
									if (todo <= 0 || i == 99) {
										if (!hasImages && !hasTerm && !hasUser) { bot.sendMessage(msg, "Deleted " + delcount + " messages", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
										} else if (hasImages) { bot.sendMessage(msg, "Deleted " + delcount + " images", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
										} else if (hasTerm) { bot.sendMessage(msg, "Deleted " + delcount + " messages containing " + term, (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
										} else if (hasUser) { bot.sendMessage(msg, "Deleted " + delcount + " of " + username + "'s messages", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
										if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Done! Deleted " + delcount + " messages."); }
										return;
									}
									if (hasTerm && messages[i].content.indexOf(term) > -1) {
										bot.deleteMessage(messages[i]);
										delcount++; todo--;
									} else if (hasUser && messages[i].author.username.toLowerCase() == username) {
										bot.deleteMessage(messages[i]);
										delcount++; todo--;
									} else if (hasImages && messages[i].attachments && JSON.stringify(messages[i].attachments) !== "[]") {
										bot.deleteMessage(messages[i]);
										delcount++; todo--;
									} else if (!hasTerm && !hasUser && !hasImages) {
										bot.deleteMessage(messages[i]);
										delcount++; todo--;
									}
								}
							});
						} else { bot.sendMessage(msg, "⚠ I don't have permission to delete messages.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
					} else { bot.sendMessage(msg, "⚠ You must have permission to manage messages in this channel", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				} else { bot.sendMessage(msg, "⚠ Can't do that in a DM"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }; }
			} else { bot.sendMessage(msg, correctUsage("prune", msg.author.username), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"kick": {
		desc: "Kick a user with a message",
		usage: "<@users> [message]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) return;
			if (!msg.channel.permissionsOf(msg.author).hasPermission("kickMembers") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You don't have permission", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("kickMembers")) { bot.sendMessage(msg, "I don't have permission", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix && msg.mentions.length > 0) {
				var kickMessage = suffix.replace(/<@\d+>/g, "").trim();
				msg.mentions.map((unlucky) => {
					msg.channel.server.kickMember(unlucky);
					if (kickMessage) { bot.sendMessage(unlucky, kickMessage); }
				});
				bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else { bot.sendMessage(msg, correctUsage("kick", msg.author.username), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"ban": {
		desc: "Ban a user with a message (deletes their messages)",
		usage: "<@users> [message]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) return;
			if (!msg.channel.permissionsOf(msg.author).hasPermission("banMembers") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You don't have permission", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("banMembers")) { bot.sendMessage(msg, "I don't have permission", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix && msg.mentions.length > 0) {
				var banMessage = suffix.replace(/<@\d+>/g, "").trim();
				msg.mentions.map((unlucky) => {
					msg.channel.server.banMember(unlucky, 1);
					if (banMessage) { bot.sendMessage(unlucky, banMessage); }
				});
				bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else { bot.sendMessage(msg, correctUsage("ban", msg.author.username), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"mute": {
		desc: "Mute users for the specified time",
		usage: "<@users> <minutes>",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) return;
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You don't have permission (manage roles)", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "I don't have permission (manage roles)", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix && msg.mentions.length > 0 && /^(<@\d+>( ?)*)*( ?)*(\d+(.\d+)?)$/.test(suffix.trim())) {
				var time = parseFloat(suffix.replace(/<@\d+>/g, "").trim());
				var role = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "muted" });
				if (role) {
					msg.mentions.map((user) => {
						if (!bot.memberHasRole(user, role)) {
							bot.addMemberToRole(user, role);
						}
					});
					unMute(bot, msg, msg.mentions, time, role);
					bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else { bot.sendMessage(msg, "Please create a role named `muted` that denies send messages in all channels", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			} else { bot.sendMessage(msg, correctUsage("mute", msg.author.username), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"unmute": {
		desc: "Unmute users",
		usage: "<@users>",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) return;
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You don't have permission (manage roles)", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "I don't have permission (manage roles)", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix && msg.mentions.length > 0) {
				var role = msg.channel.server.roles.find((r) => { return r.name.toLowerCase() === "muted" });
				if (role) {
					msg.mentions.map((user) => {
						if (bot.memberHasRole(user, role)) {
							bot.removeMemberFromRole(user, role);
						}
					});
					bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else { bot.sendMessage(msg, "`muted` role not found", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			} else { bot.sendMessage(msg, correctUsage("unmute", msg.author.username), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"leave": {
		desc: "Leaves the server.",
		usage: "", deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.channel.server) {
				if (msg.channel.permissionsOf(msg.author).hasPermission("kickMembers") || msg.author.id == config.admin_id) {
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
						if (bot.servers[loopIndex].name.indexOf("Discord API") == -1 && bot.servers[loopIndex].name.indexOf("Discord Bots") == -1 && bot.servers[loopIndex].name.indexOf("Discord Developers") == -1) {
							bot.sendMessage(bot.servers[loopIndex].defaultChannel, "📣 " + announceMessages[index] + " - from your lord and savior " + msg.author.username);
							loopIndex++;
						}
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
					var toSend = ["*Changelogs:*"];
					toSend.push("━━━━━━━━━━━━━━━━━━━");
					toSend.push(messages[1]);
					toSend.push("━━━━━━━━━━━━━━━━━━━");
					toSend.push(messages[0]);
					bot.sendMessage(msg, toSend);
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
				if (role) { bot.updateRole(role, {color: parseInt(suffix.replace(/(.*) #?/, ""), 16)}); bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else { bot.sendMessage(msg, "Role \"" + suffix.replace(/ #?[a-f0-9]{6}/i, "") + "\" not found",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
			} else { bot.sendMessage(msg, correctUsage("color", msg.author.username),function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"givecolor": {
		desc: "Give a user a color",
		usage: "<@users> <color as hex>",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!/^<@(.*)> #?[a-f0-9]{6}$/i.test(suffix)) { bot.sendMessage(msg, correctUsage("givecolor", msg.author.username), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You can't edit roles!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "I can't manage roles!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (msg.mentions.length < 1) { bot.sendMessage(msg, "You must mention the users you want to change the color of!",(erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			var role = msg.channel.server.roles.get("name", "#" + suffix.replace(/(.*) #?/, "").toLowerCase());
			var roleExists = (role) ? true : false;
			msg.mentions.map((user) => {
				msg.channel.server.rolesOfUser(user).map((r) => {
					if (/^#[a-f0-9]{6}$/i.test(r.name)) {
						if (r.name != "#" + suffix.replace(/(.*) #?/, "").toLowerCase()) { bot.removeMemberFromRole(user, r, () => {setTimeout(() => {if (msg.channel.server.usersWithRole(r).length < 1) { bot.deleteRole(r, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e,function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); } }) }},500);}); }
					}
				});
				if (roleExists) {
					bot.addMemberToRole(user, role, (e) => { if (e) { bot.sendMessage(msg, "Error giving member role: " + e); return; } });
					bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else {
					msg.channel.server.createRole({color: parseInt(suffix.replace(/(.*) #?/, ""), 16), hoist: false, permissions: [], name: "#" + suffix.replace(/(.*) #?/, "").toLowerCase()}, (e, rl) => {
						if (e) { bot.sendMessage(msg, "Error creating role: " + e); return; }
						role = rl;
						roleExists = true;
						bot.addMemberToRole(user, role, (e) => { if (e) { bot.sendMessage(msg, "Error giving member role: " + e); return; } });
						bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
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
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
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
				bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (/^#?[a-f0-9]{6}$/i.test(suffix.trim())) {
				var role = msg.channel.server.roles.get("name", "#" + suffix.trim().replace(/(.*) #?/, "").toLowerCase());
				if (!role) { bot.sendMessage(msg, "Color not found",function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				bot.deleteRole(role, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e,function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; } });
				bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else if (suffix.trim() == "clean") {
				msg.channel.server.roles.map((role) => {
					if (/^#?[a-f0-9]{6}$/.test(role.name)) {
						if (msg.channel.server.usersWithRole(role).length < 1) { bot.deleteRole(role, (e) => { if (e) { bot.sendMessage(msg, "Error deleting role: " + e,function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); } }); }
					}
				});
				bot.sendMessage(msg, msg.author.username + " 👍", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else { bot.sendMessage(msg, correctUsage("removecolor", msg.author.username),function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
		}
	},
	"settings": {
		desc: "Per-server settings. Docs: **http://brussell98.github.io/bot/serversettings.html**",
		usage: "<enable/disable> <setting> | notify here | welcome <welcome message> | check",
		deleteCommand: false, cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You must have permission to manage the server!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!suffix || !/(.+ .+|check)/.test(suffix)) { bot.sendMessage(msg, correctUsage("settings", msg.author.username), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!ServerSettings.hasOwnProperty(msg.channel.server.id)) db.addServer(msg.channel.server);
			if (/enable ban ?alerts?/i.test(suffix.trim())) {
				if (!ServerSettings[msg.channel.server.id].banAlerts) {
					db.changeSetting('banAlerts', true, msg.channel.server.id);
					bot.sendMessage(msg, 'Enabled ban alerts');
				}
			}
			if (/disable ban ?alerts?/i.test(suffix.trim())) {
				if (ServerSettings[msg.channel.server.id].banAlerts) {
					db.changeSetting('banAlerts', false, msg.channel.server.id);
					bot.sendMessage(msg, 'Disabled ban alerts');
				}
			}
			if (/enable name ?changes?/i.test(suffix.trim())) {
				if (!ServerSettings[msg.channel.server.id].nameChanges) {
					db.changeSetting('nameChanges', true, msg.channel.server.id);
					bot.sendMessage(msg, 'Enabled name change alerts');
				}
			}
			if (/disable name ?changes?/i.test(suffix.trim())) {
				if (ServerSettings[msg.channel.server.id].nameChanges) {
					db.changeSetting('nameChanges', false, msg.channel.server.id);
					bot.sendMessage(msg, 'Disabled name change alerts');
				}
			}
			if (/enable delete ?commands?/i.test(suffix.trim())) {
				if (!ServerSettings[msg.channel.server.id].banAlerts) {
					db.changeSetting('deleteCommands', true, msg.channel.server.id);
					bot.sendMessage(msg, 'Enabled command deletion');
				}
			}
			if (/disable delete ?commands?/i.test(suffix.trim())) {
				if (ServerSettings[msg.channel.server.id].banAlerts) {
					db.changeSetting('deleteCommands', false, msg.channel.server.id);
					bot.sendMessage(msg, 'Disabled command deletion');
				}
			}
			if (/enable allow ?NSFW/i.test(suffix.trim())) {
				if (!ServerSettings[msg.channel.server.id].allowNSFW) {
					db.changeSetting('allowNSFW', true, msg.channel.server.id);
					bot.sendMessage(msg, 'Enabled allow NSFW');
				}
			}
			if (/disable allow ?NSFW/i.test(suffix.trim())) {
				if (ServerSettings[msg.channel.server.id].allowNSFW) {
					db.changeSetting('allowNSFW', false, msg.channel.server.id);
					bot.sendMessage(msg, 'Disabled allow NSFW');
				}
			}
			if (/notify? ?here/i.test(suffix.trim())) {
				if (msg.channel.id == msg.channel.server.defaultChannel.id) {
					db.changeSetting('notifyChannel', "general", msg.channel.server.id);
					bot.sendMessage(msg, "Ok! I'll send notifications here now.");
				} else {
					db.changeSetting('notifyChannel', msg.channel.id, msg.channel.server.id);
					bot.sendMessage(msg, "Ok! I'll send notifications here now.");
				}
			}
			if (/^welcome( ?msg| ?message)? .+/i.test(suffix.trim())) {
				db.changeSetting('welcome', suffix.replace(/^welcome( ?msg| ?message)? /i, ''), msg.channel.server.id);
				bot.sendMessage(msg, 'Welcome message set to: ' + suffix.replace(/^welcome( ?msg| ?message)? /i, ''));
			}
			if (/disable welcome( ?msg| ?message)?/i.test(suffix.trim())) {
				db.changeSetting('welcome', "none", msg.channel.server.id);
				bot.sendMessage(msg, 'Disabled welcome message');
			}
			if (suffix.trim().toLowerCase() == 'check') {
				var toSend = '**--- Current Settings ---**\n**Ban Alerts:** ' + ServerSettings[msg.channel.server.id].banAlerts + '\n**Name Changes:** ' + ServerSettings[msg.channel.server.id].nameChanges + '\n**Delete Commands:** ' + ServerSettings[msg.channel.server.id].deleteCommands + '\n**Allow NSFW:** ' + ServerSettings[msg.channel.server.id].allowNSFW + '\n**Notification Channel:** ';
				toSend += (ServerSettings[msg.channel.server.id].notifyChannel == "general") ? 'Default' : '<#' + ServerSettings[msg.channel.server.id].notifyChannel + '>';
				toSend += (ServerSettings[msg.channel.server.id].welcome.length < 1600) ? '\n**Welcome Message:** ' + ServerSettings[msg.channel.server.id].welcome : ServerSettings[msg.channel.server.id].welcome.substr(0, 1600) + '...';
				toSend += (ServerSettings[msg.channel.server.id].ignore.length > 0) ? '\n**Ignored Channels:** <#' + ServerSettings[msg.channel.server.id].ignore.join('> <#') + '>' : '\n**Ignored Channels:** none' ;
				bot.sendMessage(msg, toSend);
			}
		}
	},
	"ignore": {
		desc: "Have the bot ignore that channel",
		usage: "",
		cooldown: 3, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You must have permission to manage the server!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!ServerSettings.hasOwnProperty(msg.channel.server.id)) db.addServer(msg.channel.server);
			if (ServerSettings[msg.channel.server.id].ignore.indexOf(msg.channel.id) > -1) bot.sendMessage(msg, 'This channel is already ignored', (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			else {
				db.ignoreChannel(msg.channel.id, msg.channel.server.id);
				bot.sendMessage(msg, "Ok, I'll ignore normal commands here now.");
			}
		}
	},
	"unignore": {
		desc: "Have the bot no longer ignore that channel",
		usage: "",
		cooldown: 3, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && msg.author.id != config.admin_id) { bot.sendMessage(msg, "You must have permission to manage the server!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!ServerSettings.hasOwnProperty(msg.channel.server.id)) db.addServer(msg.channel.server);
			if (ServerSettings[msg.channel.server.id].ignore.indexOf(msg.channel.id) == -1) bot.sendMessage(msg, "This channel isn't ignored", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			else {
				db.unignoreChannel(msg.channel.id, msg.channel.server.id);
				bot.sendMessage(msg, "Ok, I'll stop ignoring this channel.");
			}
		}
	}
}

exports.commands = commands;
exports.aliases = aliases;
