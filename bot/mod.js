var config = require("./config.json"),
	games = require("./games.json"),
	version = require("../package.json").version,
	db = require("./db.js"),
	utils = require("../utils/utils.js");

//stuff for announce
var confirmCodes = [],
	announceMessages = [];

/*
=====================
Functions
=====================
*/

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
	"getout": "kick",
	"rek": "ban", "ko": "ban", "banhammer": "ban", "finishhim": "ban",
	"l": "leave",
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
			let toSend = [];
			if (!suffix) {
				toSend.push("Use `" + config.mod_command_prefix + "help <command name>` to get more info on a command.\n");
				toSend.push("Normal commands can be found using `" + config.command_prefix + "help`.\n");
				toSend.push("You can find the list online at **http://brussell98.github.io/bot/commands.html**\n");
				toSend.push("**Commands:**```glsl\n");
				Object.keys(commands).forEach(cmd => {
					if (!commands[cmd].hasOwnProperty("shouldDisplay") || (commands[cmd].hasOwnProperty("shouldDisplay") && commands[cmd].shouldDisplay))
						toSend.push("\n" + config.mod_command_prefix + cmd + " " + commands[cmd].usage + "\n\t#" + commands[cmd].desc);
				});
				toSend = toSend.join('');
				if (toSend.length >= 1990) {
					bot.sendMessage(msg.author, toSend.substr(0, 1990).substr(0, toSend.substr(0, 1990).lastIndexOf('\n\t')) + "```"); //part 1
					setTimeout(() => {bot.sendMessage(msg.author, "```glsl" + toSend.substr(toSend.substr(0, 1990).lastIndexOf('\n\t')) + "```");}, 1000); //part 2
				} else bot.sendMessage(msg.author, toSend + "```");
			} else {
				suffix = suffix.toLowerCase();
				if (aliases.hasOwnProperty(suffix)) suffix = aliases[suffix];
				if (commands.hasOwnProperty(suffix)) {
					toSend.push("`" + config.mod_command_prefix + suffix + ' ' + commands[suffix].usage + "`");
					if (commands[suffix].hasOwnProperty("info")) toSend.push(commands[suffix].info); //if extra info
					else if (commands[suffix].hasOwnProperty("desc")) toSend.push(commands[suffix].desc); //else usse the desc
					if (commands[suffix].hasOwnProperty("cooldown")) toSend.push("__Cooldown:__ " + commands[suffix].cooldown + " seconds");
					let _aliases = Object.keys(aliases).filter(a => aliases[a] == suffix);
					if (_aliases && _aliases.length > 0) toSend.push("__Aliases:__ " + _aliases.join(', '));
					if (commands[suffix].hasOwnProperty("deleteCommand")) toSend.push("*Can delete the activating message*");
					bot.sendMessage(msg, toSend);
				} else
					bot.sendMessage(msg, "Command `" + suffix + "` not found.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			}
		}
	},
	"remove-inactive": {
		desc: "Bot owner only.", usage: "",
		cooldown: 99999999, shouldDisplay: false, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (config.admin_id.includes(msg.author.id)) {
				if (/^\d+$/.test(suffix)) db.remInactive(bot, msg, parseInt(suffix));
				else db.remInactive(bot, msg);
			}
		}
	},
	"stats": {
		desc: "Get the stats of the bot",
		usage: "", cooldown: 30, deleteCommand: true,
		process: function(bot, msg) {
			if (config.admin_id.includes(msg.author.id) || msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageChannel")) {
				bot.sendMessage(msg, `\`\`\`md\n[Bot Statistics]:\n[Uptime](${Math.round(bot.uptime / (1000 * 60 * 60))} hours and ${Math.round(bot.uptime / (1000 * 60)) % 60} minutes)\n[Servers | Channels | Users](${utils.comma(bot.servers.length)} | ${utils.comma(bot.channels.length)} | ${utils.comma(bot.users.length)})\n[Memory](${Math.round(process.memoryUsage().rss / 1024 / 1000)}MB)\n[Version](${version})\n[Commands Used](${commandsProcessed} + ${talkedToTimes} Cleverbot | avg ${((commandsProcessed + talkedToTimes) / (bot.uptime / (1000 * 60))).toFixed(2)}/min)\`\`\``);
			} else { bot.sendMessage(msg, "Only server admins/mods can do this.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"playing": {
		desc: "Allows the bot owner to set the game.",
		usage: "[game]", cooldown: 180, shouldDisplay: false, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (config.allow_user_games || config.admin_id.includes(msg.author.id)) { //if usser can set games
				if (!suffix) bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]); //set to random
				else bot.setPlayingGame(suffix);
			} else bot.setPlayingGame("with " + msg.author.username);
		}
	},
	"clean": {
		desc: "Cleans the specified number of bot messages from the channel.",
		usage: "<number of bot messages 1-100>",
		cooldown: 10, deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix)) { //if suffix has digits
				if (msg.channel.isPrivate || msg.channel.permissionsOf(msg.author).hasPermission("manageMessages") || config.admin_id.includes(msg.author.id)) {
					bot.getChannelLogs(msg.channel, 100, (error, messages) => {
						if (error) {
							console.log(cWarn(" WARN ") + " Something went wrong while fetching logs.");
							return;
						}
						if (debug) console.log(cDebug(" DEBUG ") + " Cleaning bot messages...");
						let todo = parseInt(suffix),
							toDel = [];
						for (let i = 0; i < 100; i++) {
							if (todo <= 0) continue; //if already deleted the ammount
							if (messages[i].author.id == bot.user.id) {
								toDel.push(messages[i]);
								todo--;
							}
						}
						bot.deleteMessages(toDel, (er) => {
							if (er) bot.sendMessage(msg, `Error: ${er}`, (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
							else bot.sendMessage(msg, "🗑 Cleaned up " + toDel.length + " of my messages", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
							if (debug) console.log(cDebug(" DEBUG ") + " Done! Deleted " + toDel.length + " messages.");
						});
					});
				} else bot.sendMessage(msg, "You must have permission to manage messages in this channel", function(e, m) { bot.deleteMessage(m, {"wait": 8000}); });
			} else utils.correctUsage("clean", this.usage, msg, bot, config.mod_command_prefix);
		}
	},
	"prune": {
		desc: "Prunes the specified number of messages from the channel.",
		usage: "<1-100> [text query | user <username | images | links | invites>]",
		cooldown: 10, deleteCommand: true,
		info: "Formats:\n\t`1-100`\n\t`1-100 text query` Delete only containing *text query*\n\t`1-100 user @users` Delete only from the mentioned users\n\t`1-100 images` Delete only attachments\n\t`1-100 links` Delete messages containing links\n\t`1-100 invites` Delete messages containing invites",
		process: function(bot, msg, suffix) {
			if (suffix && /^\d+$/.test(suffix.split(" ")[0]) && suffix.split(" ")[0].length < 4) {
				if (!msg.channel.isPrivate) {
					if (msg.channel.permissionsOf(msg.author).hasPermission("manageMessages") || config.admin_id.includes(msg.author.id)) {
						if (msg.channel.permissionsOf(bot.user).hasPermission("manageMessages")) {
							bot.getChannelLogs(msg.channel, 100, { "before": msg }, (error, messages) => {
								if (error) {
									console.log(cWarn(" WARN ") + " Something went wrong while fetching logs.");
									return;
								}
								if (debug) console.log(cDebug(" DEBUG ") + " Pruning messages...");
								let todo = parseInt(suffix.split(" ")[0]),
									hasTerm = false, hasUser = false, hasImages = false, hasLinks = false, hasInvites = false,
									term = "", username = "",
									toDel = [];

								if (suffix.split(" ").length > 1 && !/^(user|images?|links?|invites?)$/i.test(suffix.split(" ")[1])) { //if extra text and not user|images|links|invites
									hasTerm = true; //is looking for text in the messages
									term = suffix.substring(suffix.indexOf(" ") + 1);
								} else if (suffix.split(" ").length > 2 && suffix.split(" ")[1].toLowerCase() === "user") { //looking for user
									if (msg.mentions.length < 1) { //if non-mention user
										hasUser = true;
										username = suffix.replace(/\d+ user /, "").toLowerCase();
									} else if (msg.mentions.length > 1) { //don't allow multiple users
										bot.sendMessage(msg, "⚠ Can only prune one user at a time", (e, m) => { bot.deleteMessage(m, {"wait": 15000}); });
										return;
									} else { //else use the mentioned user
										username = msg.mentions[0].username.toLowerCase();
										hasUser = true;
									}
								} else if (suffix.split(" ").length == 2 && /^images?$/.test(suffix.split(" ")[1].toLowerCase())) //looking for attachments
									hasImages = true;
								else if (suffix.split(" ").length == 2 && /^links?$/.test(suffix.split(" ")[1].toLowerCase())) //looking for attachments
									hasLinks = true;
								else if (suffix.split(" ").length == 2 && /^invites?$/.test(suffix.split(" ")[1].toLowerCase())) //looking for attachments
									hasInvites = true;
								else if (suffix.split(" ").length > 1) { //if has 'user' but nothing after
									utils.correctUsage("prune", this.usage, msg, bot, config.mod_command_prefix);
									return;
								}

								for (let i = 0; i < 100; i++) {
									if (todo <= 0) continue; //if already deleted limit
									if (hasTerm && messages[i].content.includes(term)) {
										toDel.push(messages[i]);
										todo--;
									} else if (hasUser && messages[i].author.username.toLowerCase() == username) {
										toDel.push(messages[i]);
										todo--;
									} else if (hasInvites && /(discord\.gg\/[A-Za-z0-9]+|discordapp\.com\/invite\/[A-Za-z0-9]+)/.test(messages[i].content)) {
										toDel.push(messages[i]);
										todo--;
									} else if (hasLinks && /https?:\/\//.test(messages[i].content)) {
										toDel.push(messages[i]);
										todo--;
									} else if (hasImages && messages[i].attachments && JSON.stringify(messages[i].attachments) !== "[]") {
										toDel.push(messages[i]);
										todo--;
									} else if (!hasTerm && !hasUser && !hasImages && !hasLinks && !hasInvites) {
										toDel.push(messages[i]);
										todo--;
									}
								}
								bot.deleteMessages(toDel, (er) => {
									if (er) bot.sendMessage(msg, `Error: ${er}`, (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
									if (!hasImages && !hasTerm && !hasUser)
										bot.sendMessage(msg, "🗑 Deleted " + toDel.length + " messages", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
									else if (hasImages)
										bot.sendMessage(msg, `🗑 Deleted ${toDel.length} uploads`, (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
									else if (hasTerm)
										bot.sendMessage(msg, `🗑 Deleted ${toDel.length} messages containing ${term}`, (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
									else if (hasLinks)
										bot.sendMessage(msg, `🗑 Deleted ${toDel.length} links`, (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
									else if (hasInvites)
										bot.sendMessage(msg, `🗑 Deleted ${toDel.length} invites`, (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
									else if (hasUser)
										bot.sendMessage(msg, `🗑 Deleted ${toDel.length} of ${username}'s messages`, (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
									if (debug) console.log(cDebug(" DEBUG ") + ` Done! Deleted ${toDel.length} messages.`);
								})
							});
						} else bot.sendMessage(msg, "I don't have permission to delete messages.", (e, m) => { bot.deleteMessage(m, {"wait": 8000}); });
					} else bot.sendMessage(msg, "You must have permission to manage messages in this channel", (e, m) => { bot.deleteMessage(m, {"wait": 8000}); });
				} else bot.sendMessage(msg, "Can't do that in a DM"), (e, m) => { bot.deleteMessage(m, {"wait": 8000}); };
			} else utils.correctUsage("prune", this.usage, msg, bot, config.mod_command_prefix);
		}
	},
	"kick": {
		desc: "Kick a user with a message",
		usage: "<@users> [message]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) return;
			if (!msg.channel.permissionsOf(msg.author).hasPermission("kickMembers") && !config.admin_id.includes(msg.author.id))
				bot.sendMessage(msg, "You don't have permission", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			else if (!msg.channel.permissionsOf(bot.user).hasPermission("kickMembers"))
				bot.sendMessage(msg, "I don't have permission", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			else if (suffix && msg.mentions.length > 0) {
				let kickMessage = suffix.replace(/<@\d+>/g, "").trim();
				msg.mentions.map(unlucky => {
					if (!kickMessage) msg.channel.server.kickMember(unlucky);
					else {
						bot.sendMessage(unlucky, "You were kicked from " + msg.channel.server.name + " for reason: " + kickMessage).then(() => msg.channel.server.kickMember(unlucky));
					}
				});
				bot.sendMessage(msg, msg.author.username + " 👌🏻", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			} else utils.correctUsage("kick", this.usage, msg, bot, config.mod_command_prefix);
		}
	},
	"ban": {
		desc: "Ban a user with a message (deletes their messages)",
		usage: "<@users> [message]",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) return;
			if (!msg.channel.permissionsOf(msg.author).hasPermission("banMembers") && !config.admin_id.includes(msg.author.id))
				bot.sendMessage(msg, "You don't have permission", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			else if (!msg.channel.permissionsOf(bot.user).hasPermission("banMembers"))
				bot.sendMessage(msg, "I don't have permission", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			else if (suffix && msg.mentions.length > 0) {
				let banMessage = suffix.replace(/<@\d+>/g, "").trim();
				msg.mentions.map(unlucky => {
					if (!banMessage) msg.channel.server.banMember(unlucky, 1);
					else {
						bot.sendMessage(unlucky, "You were banned from " + msg.channel.server.name + " for reason: " + banMessage).then(() => msg.channel.server.banMember(unlucky, 1));
					}
				});
				bot.sendMessage(msg, msg.author.username + " 👌🏻", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			} else utils.correctUsage("ban", this.usage, msg, bot, config.mod_command_prefix);
		}
	},
	"mute": {
		desc: "Mute users", usage: "<@users> [minutes]",
		deleteCommand: true, cooldown: 3,
		info: "Mutes the mentioned users.\nIf a number is given they will be unmuted after that many minutes (max 2 hours).",
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) return;
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && !config.admin_id.includes(msg.author.id))
				bot.sendMessage(msg, "You don't have permission (manage roles)", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			else if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles"))
				bot.sendMessage(msg, "I don't have permission (manage roles)", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			else if (suffix && msg.mentions.length > 0) {
				let time = (/\d$/.test(suffix)) ? parseFloat(suffix.match(/\d+.?\d+?/)[0]) : false;
				let role = msg.channel.server.roles.find(r => r.name.toLowerCase() === "muted");
				if (role) {
					msg.mentions.map(user => {
						if (!bot.memberHasRole(user, role))
							bot.addMemberToRole(user, role);
					});
					if (time)
						unMute(bot, msg, msg.mentions, time > 120 ? 120 : time, role);
					bot.sendMessage(msg, msg.author.username + " 👌🏻", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
				} else bot.sendMessage(msg, "Please create a role named `muted` that denies send messages in all channels", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			} else utils.correctUsage("mute", this.usage, msg, bot, config.mod_command_prefix);
		}
	},
	"unmute": {
		desc: "Unmute users",
		usage: "<@users>",
		deleteCommand: true,
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) return;
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && !config.admin_id.includes(msg.author.id))
				bot.sendMessage(msg, "You don't have permission (manage roles)", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			else if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles"))
				bot.sendMessage(msg, "I don't have permission (manage roles)", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			else if (suffix && msg.mentions.length > 0) {
				let role = msg.channel.server.roles.find(r => r.name.toLowerCase() === "muted");
				if (role) {
					msg.mentions.map(user => {
						if (bot.memberHasRole(user, role))
							bot.removeMemberFromRole(user, role);
					});
					bot.sendMessage(msg, msg.author.username + " 👌🏻", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
				} else { bot.sendMessage(msg, "`muted` role not found", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); }); }
			} else utils.correctUsage("unmute", this.usage, msg, bot, config.mod_command_prefix);
		}
	},
	"leave": {
		desc: "Leaves the server.",
		usage: "", deleteCommand: true,
		process: function(bot, msg) {
			if (msg.channel.server) {
				if (msg.channel.permissionsOf(msg.author).hasPermission("kickMembers") || config.admin_id.includes(msg.author.id)) {
					bot.sendMessage(msg, "It's not like I *wanted* to be here or anything, *baka*")
					setTimeout(() => {msg.channel.server.leave()}, 2000);
					console.log(cYellow("I've left a server on request of " + msg.sender.username + ". ") + "I'm only in " + bot.servers.length + " servers now.");
					db.handleLeave(msg.channel.server);
				} else {
					bot.sendMessage(msg, "You can't tell me what to do! *(You need permission to kick users in this channel)*");
					console.log(cYellow("Non-privileged user: " + msg.sender.username) + " tried to make me leave a server.");
				}
			} else { bot.sendMessage(msg, "I can't leave a DM.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"announce": {
		desc: "Send a PM to all users in a server. Admin only",
		deleteCommand: false, usage: "<message>", cooldown: 1,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, "You must specify a message to announce", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (msg.channel.isPrivate && !config.admin_id.includes(msg.author.id)) {
				bot.sendMessage(msg, "You can't do this outside of a server", function(erro, wMessage) {
					bot.deleteMessage(wMessage, {"wait": 10000});
					return;
				});
			}
			if (!msg.channel.isPrivate) {
				if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && !config.admin_id.includes(msg.author.id)) {
					bot.sendMessage(msg, "Server admins only", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
					return;
				}
			}
			if (!msg.channel.isPrivate) {
				if (/^\d+$/.test(suffix)) {
					let index = confirmCodes.indexOf(parseInt(suffix));
					if (index == -1) { bot.sendMessage(msg, "Code not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					bot.sendMessage(msg, "Announcing to all users, this may take a while...");
					let loopIndex = 0;
					function annLoopS() {
						if (loopIndex >= msg.channel.server.members.length) { clearInterval(annTimerS); return; }
						bot.sendMessage(msg.channel.server.members[loopIndex], "📢 " + announceMessages[index] + " - from " + msg.author + " on " + msg.channel.server.name);
						loopIndex++;
					}
					let annTimerS = setInterval(() => { annLoopS() }, 1100);
					delete confirmCodes[index];
					if (debug) { console.log(cDebug(" DEBUG ") + " Announced \"" + announceMessages[index] + "\" to members of " + msg.channel.server.name); }
				} else {
					announceMessages.push(suffix);
					let code = Math.floor(Math.random() * 100000);
					confirmCodes.push(code);
					bot.sendMessage(msg, "⚠ This will send a message to **all** users in this server. If you're sure you want to do this say `" + config.mod_command_prefix + "announce " + code + "`");
				}
			} else if (msg.channel.isPrivate && config.admin_id.includes(msg.author.id)) {
				if (/^\d+$/.test(suffix)) {
					let index = confirmCodes.indexOf(parseInt(suffix));
					if (index == -1) { bot.sendMessage(msg, "Code not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					bot.sendMessage(msg, "Announcing to all servers, this may take a while...");
					let loopIndex = 0;
					function annLoop() {
						if (loopIndex >= bot.servers.length) { clearInterval(annTimer); return; }
						if (!bot.servers[loopIndex].name.includes("Discord API") && !bot.servers[loopIndex].name.includes("Discord Bots") && !bot.servers[loopIndex].name.includes("Discord Developers")) {
							bot.sendMessage(bot.servers[loopIndex].defaultChannel, "📢 " + announceMessages[index] + " - from your lord and savior " + msg.author.username);
							loopIndex++;
						}
					}
					let annTimer = setInterval(() => { annLoop() }, 1100);
					delete confirmCodes[index];
					if (debug) { console.log(cDebug(" DEBUG ") + " Announced \"" + announceMessages[index] + "\" to all servers"); }
				} else {
					announceMessages.push(suffix);
					let code = Math.floor(Math.random() * 100000);
					confirmCodes.push(code);
					bot.sendMessage(msg, "⚠ This will send a message to **all** servers where I can speak in general. If you're sure you want to do this say `" + config.mod_command_prefix + "announce " + code + "`");
				}
			}
		}
	},
	"changelog": {
		desc: "See recent changes to the bot",
		deleteCommand: true, usage: "", cooldown: 30,
		process: function(bot, msg) {
			let chanelogChannel = bot.channels.get("id", "135527608564580353");
			if (!chanelogChannel)
				bot.sendMessage(msg, "The bot is not in the Bot's Official Server", (e, m) => { bot.deleteMessage(m, {"wait": 8000}); });
			else {
				bot.getChannelLogs(chanelogChannel, 2, (err, messages) => {
					if (err) {
						bot.sendMessage(msg, "Error getting changelogs: " + err);
						return;
					}
					bot.sendMessage(msg, `*Changelogs:*\n━━━━━━━━━━━━━━━━━━━\n${messages[1]}\n━━━━━━━━━━━━━━━━━━━\n${messages[0]}`);
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
				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Must be done in a server!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && !config.admin_id.includes(msg.author.id)) { bot.sendMessage(msg, "You can't edit roles!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) { bot.sendMessage(msg, "I can't edit roles!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				let role = msg.channel.server.roles.find(r => suffix.replace(/ #?[a-f0-9]{6}/i, "").toLowerCase() == r.name.toLowerCase());
				if (role) {
					bot.updateRole(role, {color: parseInt(suffix.replace(/(.*) #?/, ""), 16)}); bot.sendMessage(msg, msg.author.username + " 👌🏻", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else bot.sendMessage(msg, "Role \"" + suffix.replace(/ #?[a-f0-9]{6}/i, "") + "\" not found", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else utils.correctUsage("color", this.usage, msg, bot, config.mod_command_prefix);
		}
	},
	"givecolor": {
		desc: "Give a user a color",
		usage: "<@users> <color as hex>",
		deleteCommand: true,
		cooldown: 4,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) {
				bot.sendMessage(msg, "Can't do this in a PM!", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
				return;
			}
			if (!/^<@(.*)> *#?[a-f0-9]{6}$/i.test(suffix)) {
				utils.correctUsage("givecolor", this.usage, msg, bot, config.mod_command_prefix);
				return;
			}
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && !config.admin_id.includes(msg.author.id)) {
				bot.sendMessage(msg, "You can't edit roles!", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
				return;
			}
			if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) {
				bot.sendMessage(msg, "I can't manage roles!", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
				return;
			}
			if (msg.mentions.length < 1) {
				bot.sendMessage(msg, "You must mention the users you want to change the color of!", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
				return;
			}

			let role = msg.channel.server.roles.get("name", "#" + suffix.replace(/(.*) #?/, "").toLowerCase());
			msg.mentions.map(user => {
				let currentColors = msg.channel.server.rolesOfUser(user).filter(r => /^#[a-f0-9]{6}$/i.test(r.name));
				if (currentColors && currentColors.length > 0) {
					var currentColors2 = [];
					currentColors.map(c => {
						if (msg.channel.server.usersWithRole(c).length > 1) currentColors2.push(c);
						else bot.deleteRole(c).catch(e => {if (e) console.log(cError(" ERROR ") + " " + e)});
					});
				}
				if (currentColors2 && currentColors2.length > 0) {
					bot.removeMemberFromRole(user, currentColors2, e => {
						if (e) console.log(cError(" ERROR ") + " (removing roles) " + e);
						else {
							if (role) bot.addMemberToRole(user, role, e => {if (e) console.log(cError(" ERROR ") + " (adding to role) " + e)});
							else {
								bot.createRole(msg.channel.server, {color: parseInt(suffix.replace(/(.*) #?/, ""), 16), hoist: false, permissions: [], name: "#" + suffix.replace(/(.*) #?/, "").toLowerCase()}, (e, r) => {
									if (e) {
										console.log(cError(" ERROR ") + " (creating role) " + e);
										bot.sendMessage(msg, `Error creating role: ${e}`);
									} else {
										role = r;
										bot.addMemberToRole(user, role, e => {
											if (e) console.log(cError(" ERROR ") + " (adding to new role) " + e);
											else bot.sendMessage(msg, msg.author.username.replace(/@/g, '@\u200b') + " 👌🏻", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					}); } }); } } });
				} else {
					if (role) bot.addMemberToRole(user, role, e => {if (e) console.log(cError(" ERROR ") + " (adding to role) " + e)});
					else {
						bot.createRole(msg.channel.server, {color: parseInt(suffix.replace(/(.*) #?/, ""), 16), hoist: false, permissions: [], name: "#" + suffix.replace(/(.*) #?/, "").toLowerCase()}, (e, r) => {
							if (e) {
								console.log(cError(" ERROR ") + " (creating role) " + e);
								bot.sendMessage(msg, `Error creating role: ${e}`);
							} else {
								role = r;
								bot.addMemberToRole(user, role, e => {
									if (e) console.log(cError(" ERROR ") + " (adding to new role) " + e);
									else bot.sendMessage(msg, msg.author.username.replace(/@/g, '@\u200b') + " 👌🏻", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
						}); } }); }
				}
			})

		}
	},
	"removecolor": {
		desc: "Clean unused colors | Remove a user's color | Remove a color",
		usage: "clean | @users | #hexcolor",
		deleteCommand: true,
		cooldown: 4,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) {
				bot.sendMessage(msg, "Can't do this in a PM!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				return;
			}
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageRoles") && !config.admin_id.includes(msg.author.id)) {
				bot.sendMessage(msg, "You can't edit roles!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); });
				return;
			}
			if (!msg.channel.permissionsOf(bot.user).hasPermission("manageRoles")) {
				bot.sendMessage(msg, "I can't manage roles!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				return;
			}
			if (msg.mentions.length > 0) {

				msg.mentions.map(user => {
					let colorroles = msg.channel.server.rolesOfUser(user).filter(r => /^#[a-f0-9]{6}$/.test(r.name));
					let notEmpty = [];
					if (colorroles && colorroles.length > 0) {
						colorroles.map(role => {
							if (msg.channel.server.usersWithRole(role).length > 1) notEmpty.push(role);
							else bot.deleteRole(role).catch(e => {if (e) console.log(cError(" ERROR ") + " " + e)});
						});
						if (notEmpty.length > 0) bot.removeMemberFromRole(user, notEmpty);
					}
				});
				bot.sendMessage(msg, msg.author.username + " 👌🏻", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });

			} else if (/^#?[a-f0-9]{6}$/i.test(suffix.trim())) {

				let role = msg.channel.server.roles.get("name", "#" + suffix.replace(/#?/, "").toLowerCase());
				if (!role) bot.sendMessage(msg, "Color not found", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				else {
					bot.deleteRole(role, e => {
						if (e) {
							bot.sendMessage(msg, "Error deleting role: " + e, (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
							console.log(cError(" ERROR ") + " " + e);
						} else bot.sendMessage(msg, msg.author.username + " 👌🏻", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					});
				}

			} else if (suffix.trim() == "clean") {

				let count = 0;
				msg.channel.server.roles.map(role => {
					if (/^#?[a-f0-9]{6}$/i.test(role.name)) {
						if (msg.channel.server.usersWithRole(role).length < 1) {
							bot.deleteRole(role).catch(e => {if (e) console.log(cError(" ERROR ") + " " + e)});
							count++;
						}
					}
				});
				bot.sendMessage(msg, "🎨 Removed " + count + " colors with no users", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });

			} else utils.correctUsage("removecolor", this.usage, msg, bot, config.mod_command_prefix);
		}
	},
	"settings": {
		desc: "Per-server settings. Docs: **http://brussell98.github.io/bot/serversettings.html**",
		usage: "<enable/disable> <setting> | notify here | welcome <welcome message> | check",
		deleteCommand: false, cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) {
				bot.sendMessage(msg, "Can't do this in a PM!", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
				return;
			}
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && !config.admin_id.includes(msg.author.id)) {
				bot.sendMessage(msg, "You must have permission to manage the server!", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
				return;
			}
			if (!suffix || !/(.+ .+|check)/.test(suffix)) {
				utils.correctUsage("settings", this.usage, msg, bot, config.mod_command_prefix);
				return;
			}
			if (!ServerSettings.hasOwnProperty(msg.channel.server.id))
				db.addServer(msg.channel.server);
			if (/enable ban ?alerts?/i.test(suffix.trim())) {
				if (!ServerSettings[msg.channel.server.id].banAlerts) {
					db.changeSetting('banAlerts', true, msg.channel.server.id);
					bot.sendMessage(msg, '⚙ Enabled ban alerts');
				} bot.sendMessage(msg, "Ban alerts are already enabled!");
			}
			if (/disable ban ?alerts?/i.test(suffix.trim())) {
				if (ServerSettings[msg.channel.server.id].banAlerts) {
					db.changeSetting('banAlerts', false, msg.channel.server.id);
					bot.sendMessage(msg, '⚙ Disabled ban alerts');
				} bot.sendMessage(msg, "Ban alerts are already disabled!");
			}
			if (/enable name ?changes?/i.test(suffix.trim())) {
				if (!ServerSettings[msg.channel.server.id].nameChanges) {
					db.changeSetting('nameChanges', true, msg.channel.server.id);
					bot.sendMessage(msg, '⚙ Enabled name change alerts');
				} bot.sendMessage(msg, "Name change alerts are already enabled!");
			}
			if (/disable name ?changes?/i.test(suffix.trim())) {
				if (ServerSettings[msg.channel.server.id].nameChanges) {
					db.changeSetting('nameChanges', false, msg.channel.server.id);
					bot.sendMessage(msg, '⚙ Disabled name change alerts');
				} bot.sendMessage(msg, "Name change alerts are already disabled!");
			}
			if (/enable delete ?commands?/i.test(suffix.trim())) {
				if (!ServerSettings[msg.channel.server.id].deleteCommands) {
					db.changeSetting('deleteCommands', true, msg.channel.server.id);
					bot.sendMessage(msg, '⚙ Enabled command deletion');
				} bot.sendMessage(msg, "Command deletion is already enabled!");
			}
			if (/disable delete ?commands?/i.test(suffix.trim())) {
				if (ServerSettings[msg.channel.server.id].deleteCommands) {
					db.changeSetting('deleteCommands', false, msg.channel.server.id);
					bot.sendMessage(msg, '⚙ Disabled command deletion');
				} bot.sendMessage(msg, "Command deletion is already disabled!");
			}
			if (/^(?!welcome).*enable( allow)? ?nsfw/i.test(suffix.trim())) {
				if (!ServerSettings[msg.channel.server.id].allowNSFW) {
					db.changeSetting('allowNSFW', true, msg.channel.server.id);
					bot.sendMessage(msg, '⚙ Enabled allow NSFW');
				} bot.sendMessage(msg, "NSFW image search is already enabled!");
			}
			if (/^(?!welcome).*disable( allow)? ?nsfw/i.test(suffix.trim())) {
				if (ServerSettings[msg.channel.server.id].allowNSFW) {
					db.changeSetting('allowNSFW', false, msg.channel.server.id);
					bot.sendMessage(msg, '⚙ Disabled allow NSFW');
				} bot.sendMessage(msg, "NSFW image search is already disabled!");
			}
			if (/notify? ?here/i.test(suffix.trim())) {
				if (msg.channel.id == msg.channel.server.defaultChannel.id) {
					db.changeSetting('notifyChannel', "general", msg.channel.server.id);
					bot.sendMessage(msg, "⚙ Ok! I'll send notifications here now.");
				} else {
					db.changeSetting('notifyChannel', msg.channel.id, msg.channel.server.id);
					bot.sendMessage(msg, "⚙ Ok! I'll send notifications here now.");
				}
			}
			if (/^welcome( ?msg| ?message)? .+/i.test(suffix.trim())) {
				db.changeSetting('welcome', suffix.replace(/^welcome( ?msg| ?message)? /i, ''), msg.channel.server.id);
				bot.sendMessage(msg, '⚙ Welcome message set to: ' + suffix.replace(/^welcome( ?msg| ?message)? /i, ''));
			}
			if (/disable welcome( ?msg| ?message)?/i.test(suffix.trim())) {
				db.changeSetting('welcome', "none", msg.channel.server.id);
				bot.sendMessage(msg, '⚙ Disabled welcome message');
			}
			if (suffix.trim().toLowerCase() == 'check') {
				let toSend = '⚙ **Current Settings** ⚙\n**Ban Alerts:** ' + ServerSettings[msg.channel.server.id].banAlerts + '\n**Name Changes:** ' + ServerSettings[msg.channel.server.id].nameChanges + '\n**Delete Commands:** ' + ServerSettings[msg.channel.server.id].deleteCommands + '\n**Allow NSFW:** ' + ServerSettings[msg.channel.server.id].allowNSFW + '\n**Notification Channel:** ';
				toSend += (ServerSettings[msg.channel.server.id].notifyChannel == "general") ? 'Default' : '<#' + ServerSettings[msg.channel.server.id].notifyChannel + '>';
				toSend += (ServerSettings[msg.channel.server.id].welcome.length < 1600) ? '\n**Welcome Message:** ' + ServerSettings[msg.channel.server.id].welcome : ServerSettings[msg.channel.server.id].welcome.substr(0, 1600) + '...';
				toSend += (ServerSettings[msg.channel.server.id].ignore.length > 0) ? '\n**Ignored Channels:** <#' + ServerSettings[msg.channel.server.id].ignore.join('> <#') + '>' : '\n**Ignored Channels:** none' ;
				bot.sendMessage(msg, toSend);
			}
			if (suffix.trim().toLowerCase() == 'help') {
				bot.sendMessage(msg, "Docs can be found here: **http://brussell98.github.io/bot/serversettings.html**");
			}
		}
	},
	"ignore": {
		desc: "Have the bot ignore that channel",
		usage: "",
		cooldown: 3, deleteCommand: true,
		process: function(bot, msg) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && !config.admin_id.includes(msg.author.id)) { bot.sendMessage(msg, "You must have permission to manage the server!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!ServerSettings.hasOwnProperty(msg.channel.server.id)) db.addServer(msg.channel.server);
			if (ServerSettings[msg.channel.server.id].ignore.includes(msg.channel.id)) bot.sendMessage(msg, 'This channel is already ignored', (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			else {
				db.ignoreChannel(msg.channel.id, msg.channel.server.id);
				bot.sendMessage(msg, "🔇 Ok, I'll ignore normal commands here now.");
			}
		}
	},
	"unignore": {
		desc: "Have the bot no longer ignore that channel",
		usage: "",
		cooldown: 3, deleteCommand: true,
		process: function(bot, msg) {
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do this in a PM!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && !config.admin_id.includes(msg.author.id)) { bot.sendMessage(msg, "You must have permission to manage the server!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (!ServerSettings.hasOwnProperty(msg.channel.server.id)) db.addServer(msg.channel.server);
			if (!ServerSettings[msg.channel.server.id].ignore.includes(msg.channel.id)) bot.sendMessage(msg, "This channel isn't ignored", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			else {
				db.unignoreChannel(msg.channel.id, msg.channel.server.id);
				bot.sendMessage(msg, "🔉 Ok, I'll stop ignoring this channel.");
			}
		}
	},
	"setavatar": {
		desc: "Sets the avatar", usage: "<file name>",
		cooldown: 3, deleteCommand: true, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (config.admin_id.includes(msg.author.id)) {
				console.log('Setting avatar to: ' + suffix + ' on request of ' + msg.author.username);
				utils.setAvatar(suffix, bot);
			}
		}
	},
	"setname": {
		desc: "Sets the bot's name", usage: "<name>",
		cooldown: 3, deleteCommand: true, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (config.admin_id.includes(msg.author.id)) {
				console.log('Setting username to: ' + suffix + ' on request of ' + msg.author.username);
				bot.updateDetails({username: suffix});
			}
		}
	},
	"msgowner": {
		desc: "Message the owner of a server", usage: "<server> | <text>",
		cooldown: 3, deleteCommand: true, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (config.admin_id.includes(msg.author.id) && suffix && suffix.includes('|')) {
				let server = suffix.split('|')[0].trim();
				suffix = suffix.substr(suffix.indexOf('|')).trim()
				server = /^\d+$/.test(server) ? bot.servers.get('id', server) : bot.servers.get('name', server);
				if (server && suffix) {
					bot.sendMessage(server.owner, suffix + ' - ***Bot Owner***');
					bot.sendMessage(msg, `Sent to ${server.owner.username.replace(/@/g, '@\u200b')}`);
				}
			}
		}
	},
	"getinvite": {
		desc: "Get an invite to a server", usage: "<server>",
		cooldown: 3, deleteCommand: true, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (config.admin_id.includes(msg.author.id) && suffix) {
				let server = /^\d+$/.test(suffix) ? bot.servers.get('id', suffix) : bot.servers.get('name', suffix);
				if (server) {
					server.createInvite(server.defaultChannel, (err, invite) => {
						if (err) bot.sendMessage(msg, err);
						else bot.sendMessage(msg, `Invite to ${server.name.replace(/@/g, '@\u200b')}:\nhttps://discord.gg/${invite.code}`);
					});
				} else
					bot.sendMessage(msg, "Server not found", (e, m) => { bot.deleteMessage(m, {"wait": 10000}); });
			}
		}
	}
}

exports.commands = commands;
exports.aliases = aliases;
