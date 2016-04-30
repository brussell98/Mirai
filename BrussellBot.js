//Run this with node to run the bot.

var commands = require("./bot/commands.js")
	,mod = require("./bot/mod.js")
	,config = require("./bot/config.json")
	,games = require("./bot/games.json")
	,versioncheck = require("./bot/versioncheck.js")
	,discord = require("discord.js")
	,cleverbot = require("./bot/cleverbot.js").cleverbot
	,db = require("./bot/db.js")
	,remind = require('./bot/remind.js')
	,utils = require("./utils/utils.js")
	,chalk = require('chalk')
	,clk = new chalk.constructor({enabled: true});

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

checkConfig();

var lastExecTime = {}
	,pmCoolDown = {};
setInterval(() => {lastExecTime = {};pmCoolDown = {}},3600000);
commandsProcessed = 0, talkedToTimes = 0;
show_warn = config.show_warn, debug = config.debug;

var bot = new discord.Client({maxCachedMessages: 1000, forceFetchUsers: true});
bot.on("error", m=>{ console.log(cError(" WARN ") + " " + m); });
bot.on("warn", m=>{ if (show_warn) console.log(cWarn(" WARN ") + " " + m); });
bot.on("debug", m=>{ if (debug) console.log(cDebug(" DEBUG ") +  " " + m); });

bot.on("ready", () => {
	bot.setPlayingGame(games[Math.floor(Math.random() * (games.length))]);
	console.log(cGreen("BrussellBot is ready!") + ` Listening to ${bot.channels.length} channels on ${bot.servers.length} servers`);
	versioncheck.checkForUpdate();
	setTimeout(()=>{db.checkServers(bot)},10000);
	remind.checkReminders(bot);
	if (config.carbon_key)
		utils.updateCarbon(config.carbon_key, bot.servers.length);
});

bot.on("disconnected", () => {
	console.log(cRed("Disconnected") + " from Discord");
	commandsProcessed = 0, talkedToTimes = 0, lastExecTime = {};
	setTimeout(() => {
		console.log("Attempting to log in...");
		bot.loginWithToken(config.token, (err, token) => {
			if (err) { console.log(err); setTimeout(() => { process.exit(1); }, 2000); }
			if (!token) { console.log(cWarn(" WARN ") + " failed to connect"); setTimeout(() => { process.exit(0); }, 2000); }
		});
	});
});

bot.on("message", msg => {
	if (msg.author.id == bot.user.id) return;
	if (msg.channel.isPrivate) {
		if (/(^https?:\/\/discord\.gg\/[A-Za-z0-9]+$|^https?:\/\/discordapp\.com\/invite\/[A-Za-z0-9]+$)/.test(msg.content))
			bot.sendMessage(msg.author, `Use this to bring me to your server: <https://discordapp.com/oauth2/authorize?&client_id=${config.app_id}&scope=bot&permissions=12659727>`);
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
			if (msg.isMentioned(bot.user) && msg.content.startsWith(`<@${bot.user.id}>`)) {
				if (ServerSettings.hasOwnProperty(msg.channel.server.id)) { if (!ServerSettings[msg.channel.server.id].ignore.includes(msg.channel.id)) {
					cleverbot(bot, msg); talkedToTimes += 1; db.updateTimestamp(msg.channel.server);
				}} else { cleverbot(bot, msg); talkedToTimes += 1; db.updateTimestamp(msg.channel.server); }
			}
			if (msg.content.includes(`<@${config.admin_id}>`)) {
				if (config.send_mentions) {
					let owner = bot.users.get("id", config.admin_id);
					if (owner && owner.status != "online") {
						let toSend = "";
						if (msg.channel.messages.length >= 3) {
							let mIndex = msg.channel.messages.indexOf(msg);
							if (Date.now() - msg.channel.messages[mIndex-2].timestamp <= 120000)
								toSend += msg.channel.messages[mIndex-2].cleanContent + "\n ---\n";
							if (Date.now() - msg.channel.messages[mIndex-1].timestamp <= 120000)
								toSend += msg.channel.messages[mIndex-1].cleanContent + "\n ---\n";
							if (toSend.length + msg.cleanContent.length >= 1930)
								toSend = msg.cleanContent.substr(0, 1930);
							else toSend += msg.cleanContent.substr(0, 1930);
							bot.sendMessage(owner, `*${msg.channel.server.name} > ${msg.author.username}:*\n${toSend}`);
						} else bot.sendMessage(owner, `*${msg.channel.server.name} > ${msg.author.username}:*\n${msg.cleanContent.substr(0, 1930)}`);
					}
				}
			}
		}
	}
	if (msg.author.id == config.admin_id && msg.content.startsWith("(eval) ")) { evaluateString(msg); return; } //bot owner eval command
	if (!msg.content.startsWith(config.command_prefix) && !msg.content.startsWith(config.mod_command_prefix)) return;
	if (msg.content.indexOf(" ") == 1 && msg.content.length > 2) msg.content = msg.content.replace(" ", "");
	if (!msg.channel.isPrivate && !msg.content.startsWith(config.mod_command_prefix) && ServerSettings.hasOwnProperty(msg.channel.server.id)) {
		if (ServerSettings[msg.channel.server.id].ignore.includes(msg.channel.id)) return;
	}
	let cmd = msg.content.split(" ")[0].substring(1).toLowerCase();
	let suffix = msg.content.substring(cmd.length + 2).trim();
	if (msg.content.startsWith(config.command_prefix)) {
		if (commands.commands.hasOwnProperty(cmd)) execCommand(msg, cmd, suffix, "normal");
		else if (commands.aliases.hasOwnProperty(cmd)) {
			if (!msg.channel.isPrivate) db.updateTimestamp(msg.channel.server);
			msg.content = msg.content.replace(/[^ ]+ /, config.command_prefix + commands.aliases[cmd] + " ");
			execCommand(msg, commands.aliases[cmd], suffix);
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

function execCommand(msg, cmd, suffix, type = "normal") {
	try {
		commandsProcessed += 1;
		if (type == "normal") {
			if (!msg.channel.isPrivate) console.log(cServer(msg.channel.server.name) + " > " + cGreen(msg.author.username) + " > " + msg.cleanContent.replace(/\n/g, " "));
			else console.log(cGreen(msg.author.username) + " > " + msg.cleanContent.replace(/\n/g, " "));
			if (msg.author.id != config.admin_id && commands.commands[cmd].hasOwnProperty("cooldown")) {
				if (!lastExecTime.hasOwnProperty(cmd)) lastExecTime[cmd] = {};
				if (!lastExecTime[cmd].hasOwnProperty(msg.author.id)) lastExecTime[cmd][msg.author.id] = new Date().valueOf();
				else {
					let now = Date.now();
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
					let now = Date.now();
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
bot.on("serverNewMember", (server, user) => {
	if (config.non_essential_event_listeners && ServerSettings.hasOwnProperty(server.id) && ServerSettings[server.id].welcome != "none") {
		if (!user.username || !ServerSettings[server.id].welcome || !server.name) return;
		if (debug) { console.log("New member on " + server.name + ": " + user.username); }
		bot.sendMessage(server.defaultChannel, ServerSettings[server.id].welcome.replace(/\$USER\$/gi, user.username.replace(/@/g, '@\u200b')).replace(/\$SERVER\$/gi, server.name.replace(/@/g, '@\u200b')));
	}
});

bot.on("channelDeleted", channel => {
	if (channel.isPrivate) return;
	if (ServerSettings.hasOwnProperty(channel.server.id)) {
		if (ServerSettings[channel.server.id].ignore.includes(channel.id)) {
			db.unignoreChannel(channel.id, channel.server.id);
			if (debug) console.log(cDebug(" DEBUG ") + " Ignored channel was deleted and removed from the DB");
		}
	}
});

bot.on("userBanned", (user, server) => {
	if (config.non_essential_event_listeners && ServerSettings.hasOwnProperty(server.id) && ServerSettings[server.id].banAlerts == true) {
		console.log(user.username + cRed(" banned on ") + server.name);
		if (ServerSettings[server.id].notifyChannel != "general") bot.sendMessage(ServerSettings[server.id].notifyChannel, "⚠ " + user.username.replace(/@/g, '@\u200b') + " was banned");
		else bot.sendMessage(server.defaultChannel, "🍌🔨 " + user.username.replace(/@/g, '@\u200b') + " was banned");
		bot.sendMessage(user, "🍌🔨 You were banned from " + server.name);
	}
});

bot.on("userUnbanned", (user, server) => {
	if (server.members.length <= 500 && config.non_essential_event_listeners) { console.log(user.username + " unbanned on " + server.name); }
});

bot.on("presence", (userOld, userNew) => {
	if (config.log_presence) {
		if ((userNew.status != userOld.status) && (userNew.game === null || userNew.game === undefined)) console.log(cDebug(" PRESENCE ") + " " + userNew.username + " is now " + userNew.status);
		else if (userNew.status != userOld.status) console.log(cDebug(" PRESENCE ") + ` ${userNew.username} is now ${userNew.status} playing ${userNew.game.name}`);
	}
	if (config.non_essential_event_listeners) {
		if (userOld.username == undefined || userNew.username == undefined) return;
		if (userOld.username != userNew.username) {
			bot.servers.map(ser => {
				if (ServerSettings.hasOwnProperty(ser.id) && ServerSettings[ser.id].nameChanges == true) {
					if (ser.members.get('id', userOld.id)) {
						if (ServerSettings[ser.id].notifyChannel == "general") bot.sendMessage(ser, `[${new Date().toUTCString()}] **\`${userOld.username.replace(/@/g, '@\u200b')}\`** --> **\`${userNew.username.replace(/@/g, '@\u200b')}\`**`);
						else bot.sendMessage(ServerSettings[ser.id].notifyChannel, `[${new Date().toUTCString()}] **\`${userOld.username.replace(/@/g, '@\u200b')}\`** --> **\`${userNew.username.replace(/@/g, '@\u200b')}\`**`);
					}
				}
			});
		}
	}
});

bot.on("serverDeleted", server => {
	console.log(cUYellow("Left server") + " " + server.name);
	db.handleLeave(server);
});

bot.on("serverCreated", server => {
	if (db.serverIsNew(server)) {
		console.log(cGreen("Joined server: ") + server.name);
		if (config.banned_server_ids && config.banned_server_ids.includes(server.id)) {
			console.log(cRed("Joined server but it was on the ban list") + `: ${server.name}`);
			bot.sendMessage(server.defaultChannel, "This server is on the ban list");
			setTimeout(()=>{bot.leaveServer(server);},1000);
		} else {
			db.addServerToTimes(server);
			bot.sendMessage(server.defaultChannel, `👋🏻 Hi! I'm **${bot.user.username.replace(/@/g, '@\u200b')}**\nYou can use **\`${config.command_prefix}help\`** to see what I can do.\nMod/Admin commands *including bot settings* can be viewed with **\`${config.mod_command_prefix}help\`**\nFor help, feedback, bugs, info, changelogs, etc. go to **<https://discord.gg/0kvLlwb7slG3XCCQ>**`);
			//db.addServer(server);
		}
	}
});

/* Login */
console.log("Logging in...");
bot.loginWithToken(config.token, (err, token) => {
	if (err) { console.log(err); setTimeout(() => { process.exit(1); }, 2000); }
	if (!token) { console.log(cWarn(" WARN ") + " failed to connect"); setTimeout(() => { process.exit(0); }, 2000); }
});

function reload() {
	delete require.cache[require.resolve(__dirname + "/bot/config.json")];
	delete require.cache[require.resolve(__dirname + "/bot/games.json")];
	delete require.cache[require.resolve(__dirname + "/bot/commands.js")];
	delete require.cache[require.resolve(__dirname + "/bot/mod.js")];
	delete require.cache[require.resolve(__dirname + "/bot/versioncheck.js")];
	delete require.cache[require.resolve(__dirname + "/bot/cleverbot.js")];
	delete require.cache[require.resolve(__dirname + "/bot/db.js")];
	delete require.cache[require.resolve(__dirname + "/bot/remind.js")];
	delete require.cache[require.resolve(__dirname + "/utils/utils.js")];
	config = 			require(__dirname + "/bot/config.json");
	games = 			require(__dirname + "/bot/games.json");
	versioncheck = 		require(__dirname + "/bot/versioncheck.js");
	cleverbot = 		require(__dirname + "/bot/cleverbot").cleverbot;
	db = 				require(__dirname + "/bot/db.js");
	remind = 			require(__dirname + "/bot/remind.js");
	utils = 			require(__dirname + "/utils/utils.js");
	try { commands = 	require(__dirname + "/bot/commands.js");
	} catch (err) { console.log(cError(" ERROR ") + " Problem loading commands.js: " + err); }
	try { mod = 		require(__dirname + "/bot/mod.js");
	} catch (err) { console.log(cError(" ERROR ") + " Problem loading mod.js: " + err); }
	console.log(cBgGreen(" Module Reload ") + " Success");
}

function checkConfig() {
	if (!config.token) console.log(cWarn(" WARN ") + " Token not defined");
	if (!config.app_id) console.log(cWarn(" WARN ") + " App ID not defined");
	if (!config.command_prefix || config.command_prefix.length !== 1) console.log(cWarn(" WARN ") + " Prefix either not defined or more than one character");
	if (!config.mod_command_prefix || config.mod_command_prefix.length !== 1) console.log(cWarn(" WARN ") + " Mod prefix either not defined or more than one character");
	if (!config.admin_id) console.log(cYellow("Admin user's id") + " not defined in config");
	if (!config.mal_user) console.log(cYellow("MAL username") + " not defined in config");
	if (!config.mal_pass) console.log(cYellow("MAL password") + " not defined in config");
	if (!config.weather_api_key) console.log(cYellow("OpenWeatherMap API key") + " not defined in config");
	if (!config.osu_api_key) console.log(cYellow("Osu API key") + " not defined in config");
	if (!config.imgur_client_id) console.log(cYellow("Imgur client id") + " not defined in config");
}

function evaluateString(msg) {
	if (msg.author.id != config.admin_id) { console.log(cWarn(" WARN ") + " Somehow an unauthorized user got into eval!"); return; }
	let timeTaken = new Date(), result;
	console.log("Running eval");
	try { result = eval(msg.content.substring(7));
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
		utils.updateCarbon(config.carbon_key, bot.servers.length);
	}, 9000000);
}
