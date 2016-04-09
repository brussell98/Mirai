//Run this with node to run the bot.

var commands = require("./bot/commands.js")
	,mod = require("./bot/mod.js")
	,config = require("./bot/config.json")
	,games = require("./bot/games.json")
	,versioncheck = require("./bot/versioncheck.js")
	,discord = require("discord.js")
	,cleverbot = require("./bot/cleverbot.js").cleverbot
	,db = require("./bot/db.js")
	,request = require('request')
	,remind = require('./bot/remind.js')
	,chalk = require('chalk')
	,clk = new chalk.constructor({enabled: true});
checkConfig();

cWarn = clk.bgYellow.black;
cError = clk.bgRed.black;
cDebug = clk.bgWhite.black;
cGreen = clk.bold.green;
cGrey = clk.bold.grey;
cYellow = clk.bold.yellow;
cBlue = clk.bold.blue;
cRed = clk.bold.red;
cServer = clk.bold.magenta;
cUYellow = clk.bold.underline.yellow;
cBgGreen = clk.bgGreen.black;

var lastExecTime = {}
	,pmCoolDown = {};
setInterval(() => {lastExecTime = {};pmCoolDown = {}},3600000);
commandsProcessed = 0, talkedToTimes = 0;
show_warn = config.show_warn, debug = config.debug;

var bot = new discord.Client({maxCachedMessages: 10, forceFetchUsers: true});
bot.on("error", m=>{ console.log(cError(" WARN ") + " " + m); });
bot.on("warn", m=>{ if (show_warn) console.log(cWarn(" WARN ") + " " + m); });
bot.on("debug", m=>{ if (debug) console.log(cDebug(" DEBUG ") +  " " + m); });

bot.on("ready", () => {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
	console.log(cGreen("BrussellBot is ready!") + " Listening to " + bot.channels.length + " channels on " + bot.servers.length + " servers");
	versioncheck.checkForUpdate();
	db.checkServers(bot);
	remind.checkReminders(bot);
	if (config.carbon_key) {
		request.post({
				"url": "https://www.carbonitex.net/discord/data/botdata.php",
				"headers": {"content-type": "application/json"}, "json": true,
				body: {
					"key": config.carbon_key,
					"servercount": bot.servers.length
				}
			}, (e, r)=>{
			if (config.debug) console.log(cDebug(" DEBUG ") + " Updated Carbon server count");
			if (e) console.log("Error updating carbon stats: " + e);
			if (r.statusCode !== 200) console.log("Error updating carbon stats: Status Code " + r.statusCode);
		});
	}
});

bot.on("disconnected", () => {
	console.log(cRed("Disconnected") + " from Discord");
	commandsProcessed = 0, talkedToTimes = 0, lastExecTime = {};
	setTimeout(() => {
		console.log("Attempting to log in...");
		bot.login(config.email, config.password, (err, token)=>{
			if (err) { console.log(err); process.exit(0); }
			if (!token) { console.log(cWarn(" WARN ") + " Failed to re-connect"); process.exit(0); }
		});}, 20000);
});

bot.on("message", msg => {
	if (msg.author.id == bot.user.id) return;
	if (msg.channel.isPrivate) {
		if (/(^https?:\/\/discord\.gg\/[A-Za-z0-9]+$|^https?:\/\/discordapp\.com\/invite\/[A-Za-z0-9]+$)/.test(msg.content)) pmInvite(msg); //accept invites sent in a DM
		else if (msg.content[0] !== config.command_prefix && msg.content[0] !== config.mod_command_prefix && !msg.content.startsWith('(eval) ')) {
			if (pmCoolDown.hasOwnProperty(msg.author.id)) {
				if (Date.now() - pmCoolDown[msg.author.id] > 3000) {
					if (/^(help|how do I use this\??)$/i.test(msg.content)) {
						commands.commands["help"].process(bot, msg);
						return;
					}
					pmCoolDown[msg.author.id] = Date.now();
					cleverbot(bot, msg);
					talkedToTimes += 1;
					return;
				}
			} else {
				pmCoolDown[msg.author.id] = Date.now();
				if (/^(help|how do I use this\??)$/i.test(msg.content)) {
					commands.commands["help"].process(bot, msg);
					return;
				}
				cleverbot(bot, msg);
				talkedToTimes += 1;
				return;
			}
		}
	} else {
		if (msg.mentions.length !== 0) {
			if (msg.isMentioned(bot.user) && msg.content.startsWith("<@" + bot.user.id + ">")) {
				if (ServerSettings.hasOwnProperty(msg.channel.server.id)) { if (ServerSettings[msg.channel.server.id].ignore.indexOf(msg.channel.id) === -1) {
					cleverbot(bot, msg); talkedToTimes += 1; db.updateTimestamp(msg.channel.server);
				}} else { cleverbot(bot, msg); talkedToTimes += 1; db.updateTimestamp(msg.channel.server); }
			}
			if (msg.content.indexOf("<@" + config.admin_id + ">") > -1) {
				if (config.send_mentions) {
					var owner = bot.users.get("id", config.admin_id);
					if (owner && owner.status != "online") {
						var toSend = "";
						if (msg.channel.messages.length >= 3) {
							var mIndex = msg.channel.messages.indexOf(msg);
							if (Date.now() - msg.channel.messages[mIndex-2].timestamp <= 120000)
								toSend += msg.channel.messages[mIndex-2].cleanContent + "\n\n";
							if (Date.now() - msg.channel.messages[mIndex-1].timestamp <= 120000)
								toSend += msg.channel.messages[mIndex-1].cleanContent + "\n\n";
							if (toSend.length + msg.cleanContent.length >= 1930)
								toSend = msg.cleanContent.substr(0, 1930);
							else toSend += msg.cleanContent.substr(0, 1930);
							bot.sendMessage(owner, msg.channel.server.name + " > " + msg.author.username + ":\n");
						} else bot.sendMessage(owner, msg.channel.server.name + " > " + msg.author.username + ":\n" + msg.cleanContent.substr(0, 1930));
					}
				}
			}
		}
	}
	if (msg.author.id == config.admin_id && msg.content.startsWith("(eval) ")) { evaluateString(msg); return; } //bot owner eval command
	if (!msg.content.startsWith(config.command_prefix) && !msg.content.startsWith(config.mod_command_prefix)) return;
	if (msg.content.indexOf(" ") == 1 && msg.content.length > 2) { msg.content = msg.content.replace(" ", ""); }
	if (!msg.channel.isPrivate && !msg.content.startsWith(config.mod_command_prefix) && ServerSettings.hasOwnProperty(msg.channel.server.id)) {
		if (ServerSettings[msg.channel.server.id].ignore.indexOf(msg.channel.id) > -1) return;
	}
	var cmd = msg.content.split(" ")[0].replace(/\n/g, " ").substring(1).toLowerCase();
	var suffix = msg.content.replace(/\n/g, " ").substring(cmd.length + 2).trim();
	if (msg.content.startsWith(config.command_prefix)) {
		if (commands.commands.hasOwnProperty(cmd)) execCommand(msg, cmd, suffix, "normal");
		else if (commands.aliases.hasOwnProperty(cmd)) {
			if (!msg.channel.isPrivate) db.updateTimestamp(msg.channel.server);
			msg.content = msg.content.replace(/[^ ]+ /, config.command_prefix + commands.aliases[cmd] + " ");
			execCommand(msg, commands.aliases[cmd], suffix, "normal");
		}
	} else if (msg.content.startsWith(config.mod_command_prefix)) {
		if (cmd == "reload" && msg.author.id == config.admin_id) { reload(); bot.deleteMessage(msg); return; }
		if (mod.commands.hasOwnProperty(cmd)) execCommand(msg, cmd, suffix, "mod");
		else if (mod.aliases.hasOwnProperty(cmd)) {
			if (!msg.channel.isPrivate) db.updateTimestamp(msg.channel.server);
			msg.content = msg.content.replace(/[^ ]+ /, config.mod_command_prefix + mod.aliases[cmd] + " ");
			execCommand(msg, mod.aliases[cmd], suffix, "mod");
		}
	}
});

function execCommand(msg, cmd, suffix, type) {
	try {
		commandsProcessed += 1;
		if (type == "normal") {
			if (!msg.channel.isPrivate) console.log(cServer(msg.channel.server.name) + " > " + cGreen(msg.author.username) + " > " + msg.cleanContent.replace(/\n/g, " "));
			else console.log(cGreen(msg.author.username) + " > " + msg.cleanContent.replace(/\n/g, " "));
			if (msg.author.id != config.admin_id && commands.commands[cmd].hasOwnProperty("cooldown")) {
				if (!lastExecTime.hasOwnProperty(cmd)) lastExecTime[cmd] = {};
				if (!lastExecTime[cmd].hasOwnProperty(msg.author.id)) lastExecTime[cmd][msg.author.id] = new Date().valueOf();
				else {
					var now = Date.now();
					if (now < lastExecTime[cmd][msg.author.id] + (commands.commands[cmd].cooldown * 1000)) {
						bot.sendMessage(msg, msg.author.username.replace(/@/g, '@\u200b') + ", you need to *cooldown* (" + Math.round(((lastExecTime[cmd][msg.author.id] + commands.commands[cmd].cooldown * 1000) - now) / 1000) + " seconds)", (e, m)=>{ bot.deleteMessage(m, {"wait": 6000}); });
						if (!msg.channel.isPrivate) bot.deleteMessage(msg, {"wait": 10000});
						return;
					} lastExecTime[cmd][msg.author.id] = now;
				}
			}
			commands.commands[cmd].process(bot, msg, suffix);
			if (!msg.channel.isPrivate && commands.commands[cmd].hasOwnProperty("deleteCommand")) {
				if (commands.commands[cmd].deleteCommand === true && ServerSettings.hasOwnProperty(msg.channel.server.id) && ServerSettings[msg.channel.server.id].deleteCommands == true) bot.deleteMessage(msg, {"wait": 10000});
			}
		} else if (type == "mod") {
			if (!msg.channel.isPrivate)
				console.log(cServer(msg.channel.server.name) + " > " + cGreen(msg.author.username) + " > " + cBlue(msg.cleanContent.replace(/\n/g, " ").split(" ")[0]) + msg.cleanContent.replace(/\n/g, " ").substr(msg.cleanContent.replace(/\n/g, " ").split(" ")[0].length));
			else console.log(cGreen(msg.author.username) + " > " + cBlue(msg.cleanContent.replace(/\n/g, " ").split(" ")[0]) + msg.cleanContent.replace(/\n/g, " ").substr(msg.cleanContent.replace(/\n/g, " ").split(" ")[0].length));
			if (msg.author.id != config.admin_id && mod.commands[cmd].hasOwnProperty("cooldown")) {
				if (!lastExecTime.hasOwnProperty(cmd)) lastExecTime[cmd] = {};
				if (!lastExecTime[cmd].hasOwnProperty(msg.author.id)) lastExecTime[cmd][msg.author.id] = new Date().valueOf();
				else {
					var now = Date.now();
					if (now < lastExecTime[cmd][msg.author.id] + (mod.commands[cmd].cooldown * 1000)) {
						bot.sendMessage(msg, msg.author.username.replace(/@/g, '@\u200b') + ", you need to *cooldown* (" + Math.round(((lastExecTime[cmd][msg.author.id] + mod.commands[cmd].cooldown * 1000) - now) / 1000) + " seconds)", (e, m)=>{ bot.deleteMessage(m, {"wait": 6000}); });
						if (!msg.channel.isPrivate) bot.deleteMessage(msg, {"wait": 10000});
						return;
					} lastExecTime[cmd][msg.author.id] = now;
				}
			}
			mod.commands[cmd].process(bot, msg, suffix);
			if (!msg.channel.isPrivate && mod.commands[cmd].hasOwnProperty("deleteCommand")) {
				if (mod.commands[cmd].deleteCommand === true && ServerSettings.hasOwnProperty(msg.channel.server.id) && ServerSettings[msg.channel.server.id].deleteCommands == true) bot.deleteMessage(msg, {"wait": 10000});
			}
		} else return;
	} catch (err) { console.log(err.stack); }
}

/* Event Listeners */
bot.on("serverNewMember", (objServer, objUser) => {
	if (config.non_essential_event_listeners && ServerSettings.hasOwnProperty(objServer.id) && ServerSettings[objServer.id].welcome != "none") {
		if (!objUser.username || !ServerSettings[objServer.id].welcome || !objServer.name) return;
		if (debug) { console.log("New member on " + objServer.name + ": " + objUser.username); }
		bot.sendMessage(objServer.defaultChannel, ServerSettings[objServer.id].welcome.replace(/\$USER\$/gi, objUser.username.replace(/@/g, '@\u200b')).replace(/\$SERVER\$/gi, objServer.name.replace(/@/g, '@\u200b')));
	}
});

bot.on("channelDeleted", channel => {
	if (channel.isPrivate) return;
	if (ServerSettings.hasOwnProperty(channel.server.id)) {
		if (ServerSettings[channel.server.id].ignore.indexOf(channel.id) > -1) {
			db.unignoreChannel(channel.id, channel.server.id);
			if (debug) console.log(cDebug(" DEBUG ") + " Ignored channel was deleted and removed from the DB");
		}
	}
});

bot.on("userBanned", (objUser, objServer) => {
	if (config.non_essential_event_listeners && ServerSettings.hasOwnProperty(objServer.id) && ServerSettings[objServer.id].banAlerts == true) {
		console.log(objUser.username + cRed(" banned on ") + objServer.name);
		if (ServerSettings[objServer.id].notifyChannel != "general") bot.sendMessage(ServerSettings[objServer.id].notifyChannel, "⚠ " + objUser.username.replace(/@/g, '@\u200b') + " was banned");
		else bot.sendMessage(objServer.defaultChannel, "⚠ " + objUser.username.replace(/@/g, '@\u200b') + " was banned");
		bot.sendMessage(objUser, "⚠ You were banned from " + objServer.name);
	}
});

bot.on("userUnbanned", (objUser, objServer) => {
	if (objServer.members.length <= 500 && config.non_essential_event_listeners) { console.log(objUser.username + " unbanned on " + objServer.name); }
});

bot.on("presence", (userOld, userNew) => {
	if (config.log_presence) {
		if ((userNew.status != userOld.status) && (userNew.game === null || userNew.game === undefined)) console.log(cDebug(" PRESENCE ") + " " + userNew.username + " is now " + userNew.status);
		else if (userNew.status != userOld.status) console.log(cDebug(" PRESENCE ") + " " + userNew.username + " is now " + userNew.status + " playing " + userNew.game.name);
	}
	if (config.non_essential_event_listeners) {
		if (userOld.username == undefined || userNew.username == undefined) return;
		if (userOld.username != userNew.username) {
			bot.servers.map(ser => {
				if (ServerSettings.hasOwnProperty(ser.id) && ServerSettings[ser.id].nameChanges == true) {
					if (ser.members.find(x=>x.id==userOld.id)) {
						if (ServerSettings[ser.id].notifyChannel == "general") bot.sendMessage(ser, "`" + userOld.username.replace(/@/g, '@\u200b') + "` is now known as `" + userNew.username.replace(/@/g, '@\u200b') + "`");
						else bot.sendMessage(ServerSettings[ser.id].notifyChannel, "`" + userOld.username.replace(/@/g, '@\u200b') + "` is now known as `" + userNew.username.replace(/@/g, '@\u200b') + "`");
					}
				}
			});
		}
	}
});

bot.on("serverDeleted", objServer => {
	console.log(cUYellow("Left server") + " " + objServer.name);
	db.handleLeave(objServer);
});

/* Login */
console.log("Logging in...");
bot.login(config.email, config.password, function(err, token) {
	if (err) { console.log(err); setTimeout(() => { process.exit(1); }, 2000); }
	if (!token) { console.log(cWarn(" WARN ") + " failed to connect"); setTimeout(() => { process.exit(0); }, 2000); }
});

function pmInvite(msg) {
	if (msg) {
		if (debug) console.log(cDebug(" DEBUG ") + " Attempting to join: " + msg.content);
		var cServers = [];
		bot.servers.map((srvr) => { cServers.push(srvr.id); });
		bot.joinServer(msg.content, function(err, server) {
			if (err) {
				bot.sendMessage(msg, "Failed to join: " + err);
				console.log(cWarn(" WARN ") + " " + err);
			} else if (cServers.indexOf(server.id) > -1) {
				console.log("Already in server " + server.name);
				bot.sendMessage(msg, "I'm already in that server!");
			} else {
				if (config.banned_server_ids && config.banned_server_ids.indexOf(server.id) > -1) {
					console.log(cRed("Joined server but it was on the ban list") + ": " + server.name);
					bot.sendMessage(msg, "This server is on the ban list");
					bot.leaveServer(server); return;
				}
				console.log(cGreen("Joined server: ") + server.name);
				bot.sendMessage(msg, "Successfully joined " + server.name);
				var toSend = [];
				if (msg.author.id == '109338686889476096') { toSend.push("Hi! I'm **" + bot.user.username.replace(/@/g, '@\u200b') + "** and I was invited to this server through carbonitex.net."); }
				else { toSend.push("Hi! I'm **" + bot.user.username.replace(/@/g, '@\u200b') + "** and I was invited to this server by " + msg.author.username.replace(/@/g, '@\u200b') + "."); }
				toSend.push("You can use `" + config.command_prefix + "help` to see what I can do. Mods can use `" + config.mod_command_prefix + "help` for mod commands.");
				toSend.push("Mod/Admin commands __including bot settings__ can be viewed with `" + config.mod_command_prefix + "help`");
				toSend.push("For help / feedback / bugs/ testing / info / changelogs / etc. go to **https://discord.gg/0kvLlwb7slG3XCCQ**");
				bot.sendMessage(server.defaultChannel, toSend);
				db.addServer(server);
				db.addServerToTimes(server);
			}
		});
	}
}

function reload() {
	delete require.cache[require.resolve(__dirname + "/bot/config.json")];
	config = require(__dirname + "/bot/config.json");
	delete require.cache[require.resolve(__dirname + "/bot/games.json")];
	games = require(__dirname + "/bot/games.json");
	delete require.cache[require.resolve(__dirname + "/bot/commands.js")];
	try { commands = require(__dirname + "/bot/commands.js");
	} catch (err) { console.log(cError(" ERROR ") + " Problem loading commands.js: " + err); }
	delete require.cache[require.resolve(__dirname + "/bot/mod.js")];
	try { mod = require(__dirname + "/bot/mod.js");
	} catch (err) { console.log(cError(" ERROR ") + " Problem loading mod.js: " + err); }
	delete require.cache[require.resolve(__dirname + "/bot/versioncheck.js")];
	versioncheck = require(__dirname + "/bot/versioncheck.js");
	delete require.cache[require.resolve(__dirname + "/bot/cleverbot.js")];
	cleverbot = require(__dirname + "/bot/cleverbot").cleverbot;
	delete require.cache[require.resolve(__dirname + "/bot/db.js")];
	db = require(__dirname + "/bot/db.js");
	delete require.cache[require.resolve(__dirname + "/bot/remind.js")];
	remind = require(__dirname + "/bot/remind.js");
	console.log(cBgGreen(" Module Reload ") + " Success");
}

function checkConfig() {
	if (!config.email) { console.log(cWarn(" WARN ") + " Email not defined"); }
	if (!config.password) { console.log(cWarn(" WARN ") + " Password not defined"); }
	if (!config.command_prefix || config.command_prefix.length !== 1) { console.log(cWarn(" WARN ") + " Prefix either not defined or more than one character"); }
	if (!config.mod_command_prefix || config.mod_command_prefix.length !== 1) { console.log(cWarn(" WARN ") + " Mod prefix either not defined or more than one character"); }
	if (!config.admin_id) { console.log(cYellow("Admin user's id") + " not defined in config"); }
	if (!config.mal_user) { console.log(cYellow("MAL username") + " not defined in config"); }
	if (!config.mal_pass) { console.log(cYellow("MAL password") + " not defined in config"); }
	if (!config.weather_api_key) { console.log(cYellow("OpenWeatherMap API key") + " not defined in config"); }
	if (!config.osu_api_key) { console.log(cYellow("Osu API key") + " not defined in config"); }
	if (!config.imgur_client_id) { console.log(cYellow("Imgur client id") + " not defined in config"); }
}

function evaluateString(msg) {
	if (msg.author.id != config.admin_id) { console.log(cWarn(" WARN ") + " Somehow an unauthorized user got into eval!"); return; }
	var timeTaken = new Date(), result;
	console.log("Running eval");
	try { result = eval(msg.content.substring(7).replace(/\n/g, ""));
	} catch (e) { console.log(cError(" ERROR ") + " " + e); bot.sendMessage(msg, "```diff\n- " + e + "```"); }
	if (result && typeof result !== 'object') bot.sendMessage(msg, "`Compute time: " + (timeTaken - msg.timestamp) + "ms`\n" + result);
	console.log("Result: " + result);
}

setInterval(() => {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
	if (debug) { console.log(cDebug(" DEBUG ") + " Updated bot's game"); }
}, 800000); //change playing game every 12 minutes

setInterval(() => {
	remind.checkReminders(bot);
}, 30000);

if (config.carbon_key) {
	setInterval(()=>{
		request.post({
				"url": "https://www.carbonitex.net/discord/data/botdata.php",
				"headers": {"content-type": "application/json"}, "json": true,
				body: {
					"key": config.carbon_key,
					"servercount": bot.servers.length
				}
			}, (e, r)=>{
			if (config.debug) console.log(cDebug(" DEBUG ") + " Updated Carbon server count");
			if (e) console.log("Error updating carbon stats: " + e);
			if (r.statusCode !== 200) console.log("Error updating carbon stats: Status Code " + r.statusCode);
		});
	}, 3600000);
}
