var config = require("./config.json")
	,version = require("../package.json").version
	,request = require("request")
	,xml2js = require("xml2js")
	,osuapi = require("osu-api")
	,ent = require("entities")
	,waifus = require("./waifus.json")
	,remind = require('./remind.js');

var VoteDB = {}
	,LottoDB = {}
	,Ratings = {};
const IMGUR_CLIENT_ID = config.imgur_client_id;
const OSU_API_KEY = config.osu_api_key;
const OWM_API_KEY = config.weather_api_key;
const MAL_USER = config.mal_user;
const MAL_PASS = config.mal_pass;

setInterval(() => Ratings = {},86400000);

/*****************************\
		   Functions
\*****************************/

function correctUsage(cmd, usage, msg, bot, delay) {
	bot.sendMessage(msg, msg.author.username.replace(/@/g, '@\u200b') + ", the correct usage is *`" + config.command_prefix + cmd + ' ' + usage + '`*', (erro, wMessage)=>{bot.deleteMessage(wMessage, {"wait": delay || 10000});});
	bot.deleteMessage(msg, {"wait": 10000});
}

function autoEndVote(bot, msg) {
	setTimeout(() => {
		if (VoteDB.hasOwnProperty(msg.channel.id)) commands["vote"].process(bot, msg, "end");
	}, 600000); //10 minutes = 600,000
}

function autoEndLotto(bot, msg) {
	setTimeout(() => {
		if (LottoDB.hasOwnProperty(msg.channel.id)) commands["lotto"].process(bot, msg, "end");
	}, 600000);
}

function findUser(members, query) {
	var usr = members.find(member=>{ return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase() == query.toLowerCase() });
	if (!usr) { usr = members.find(member=>{ return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase().indexOf(query.toLowerCase()) == 0 }); }
	if (!usr) { usr = members.find(member=>{ return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase().indexOf(query.toLowerCase()) > -1 }); }
	return usr || false;
}

function generateRandomRating(fullName, storeRating) {
	var weightedNumber = Math.floor((Math.random() * 20) + 1); //between 1 and 20
	var score, moreRandom = Math.floor(Math.random() * 4);
	if (weightedNumber < 5) score = Math.floor((Math.random() * 3) + 1); //between 1 and 3
	else if (weightedNumber > 4 && weightedNumber < 16) score = Math.floor((Math.random() * 4) + 4); //between 4 and 7
	else if (weightedNumber > 15) score = Math.floor((Math.random() * 3) + 8); //between 8 and 10
	if (moreRandom === 0 && score !== 1) score -= 1;
	else if (moreRandom == 3 && score != 10) score += 1;
	if (storeRating) Ratings[fullName.toLowerCase()] = score;
	return score;
}

function generateUserRating(bot, msg, fullName) {
	var user = msg.channel.server.members.get("username", fullName);
	if (user === undefined) return generateRandomRating();
	var score = generateRandomRating() - 1;
	var details = msg.channel.server.detailsOfUser(user);
	if (details) {
		if ((new Date().valueOf() - new Date(details.joinedAt).valueOf()) >= 2592000000) score += 1; //if user has been on the server for at least one month +1
	}
	if (msg.channel.permissionsOf(user).hasPermission("manageServer")) score += 1; //admins get +1 ;)
	var count = 0;
	bot.servers.map(server=>{ if (server.members.indexOf(user)) count += 1; }); //how many servers does the bot share with them
	if (count > 2) score += 1; //if we share at least 3 servers
	if (!user.avatarURL) score -= 1; //gotta have an avatar
	if (user.username.length > 22) score -= 1; //long usernames are hard to type so -1
	if (score > 10) score = 10; else if (score < 1) score = 1; //keep it within 1-10
	Ratings[fullName.toLowerCase()] = score;
	return score;
}

function generateJSONRating(fullName) {
	var ranking = waifus[fullName];
	var ranges = {
		"1": "1-4", "2": "2-4",
		"3": "4-8", "4": "4-8",
		"5": "5-8", "6": "6-9",
		"7": "7-10", "8": "8-10",
		"9": "10-10"
	};
	var score = Math.floor((Math.random() * ((parseInt(ranges[ranking].split("-")[1], 10) + 1 - parseInt(ranges[ranking].split("-")[0], 10)))) + parseInt(ranges[ranking].split("-")[0], 10))
	var moreRandom = Math.floor(Math.random() * 4); //0-3
	if (score > 1 && moreRandom === 0) score -= 1; else if (score < 10 && moreRandom == 3) score += 1;
	Ratings[fullName.toLowerCase()] = score;
	return score;
}

function timeParser(ammount, mod) {
	switch (ammount) {
		case "a": case "an": case "one": case "1": //js pls
			return 1 * mod;
		case "two": case "2":
			return 2 * mod;
		case "three": case "3":
			return 3 * mod;
		default:
			return parseInt(ammount) * mod;
	}
}

/*****************************\
Commands (Check https://github.com/brussell98/BrussellBot/wiki/New-Command-Guide for how to make new ones)
\*****************************/

var aliases = {
	"h": "help", "commands": "help",
	"server": "botserver",
	"backwards": "reverse",
	"myid": "id",
	"poi?": "poi",
	"p": "ping",
	"join": "invite",
	"joined": "joinedat",
	"i": "info", "user": "info", "userinfo": "info", "serverinfo": "info",
	"a": "avatar",
	"pick": "choose", "c": "choose",
	"v": "vote",
	"coin": "coinflip", "flip": "coinflip",
	"poll": "strawpoll", "straw": "strawpoll",
	"8": "8ball", "ball": "8ball",
	"w": "weather",
	"g": "google", "lmgtfy": "google",
	"number": "numberfacts", "num": "numberfacts",
	"cat": "catfacts", "meow": "catfacts", "neko": "catfacts", "sakamotofacts": "catfacts",
	"r": "ratewaifu", "rate": "ratewaifu", "waifu": "ratewaifu",
	"imgur": "image", "im": "image",
	"f": "fortune",
	"remind": "remindme", "reminder": "remindme",
	"rekt": "rip",
	"withrole": "inrole"
};

var commands = {
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]",
		deleteCommand: true, shouldDisplay: false, cooldown: 1,
		process: function(bot, msg, suffix) {
			var toSend = [];
			if (!suffix) {
				toSend.push("Use `" + config.command_prefix + "help <command name>` to get more info on a command.\n");
				toSend.push("Mod commands can be found using `" + config.mod_command_prefix + "help`.\n");
				toSend.push("You can find the list online at **http://brussell98.github.io/bot/commands.html**\n");
				toSend.push("**Commands:**```glsl\n");
				toSend.push("@" + bot.user.username + " text\n\t#Talk to the bot (cleverbot)");
				Object.keys(commands).forEach(cmd=>{
					if (commands[cmd].hasOwnProperty("shouldDisplay")) {
						if (commands[cmd].shouldDisplay) toSend.push(`\n${config.command_prefix}${cmd} ${commands[cmd].usage}\n\t#${commands[cmd].desc}`);
					} else toSend.push(`\n${config.command_prefix}${cmd} ${commands[cmd].usage}\n\t#${commands[cmd].desc}`);
				});
				toSend = toSend.join('');
				if (toSend.length >= 1990) {
					bot.sendMessage(msg.author, toSend.substr(0, 1990).substr(0, toSend.substr(0, 1990).lastIndexOf('\n\t')) + "```");
					setTimeout(()=>{bot.sendMessage(msg.author, "```glsl" + toSend.substr(toSend.substr(0, 1990).lastIndexOf('\n\t')) + "```");}, 1000);
				} else bot.sendMessage(msg.author, toSend + "```");
			} else {
				suffix = suffix.toLowerCase();
				if (aliases.hasOwnProperty(suffix)) suffix = aliases[suffix];
				if (commands.hasOwnProperty(suffix)) {
					toSend.push("`" + config.command_prefix + suffix + ' ' + commands[suffix].usage + "`");
					if (commands[suffix].hasOwnProperty("info")) toSend.push(commands[suffix].info);
					else if (commands[suffix].hasOwnProperty("desc")) toSend.push(commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("cooldown")) toSend.push("__Cooldown:__ " + commands[suffix].cooldown + " seconds");
					if (commands[suffix].hasOwnProperty("deleteCommand")) toSend.push("*Can delete the activating message*");
					bot.sendMessage(msg, toSend);
				} else bot.sendMessage(msg, "Command `" + suffix + "` not found. Aliases aren't allowed.", (erro, wMessage)=>{ bot.deleteMessage(wMessage, {"wait": 10000}); });
			}
		}
	},
	"botserver": {
		desc: "Get a link to the BrussellBot / Bot-chan server.",
		cooldown: 10, usage: "",
		process: function(bot, msg) { bot.sendMessage(msg, "🏠 Here's an invite to my server: **<https://discord.gg/0kvLlwb7slG3XCCQ>**"); }
	},
	"reverse": {
		desc: "Returns the input backwards",
		usage: "<text>", deleteCommand: true, cooldown: 5, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (suffix) bot.sendMessage(msg, "\u202e " + suffix);
		}
	},
	"id": {
		desc: "Returns your ID (or the channel's)",
		usage: "[\"channel\"]", deleteCommand: true, cooldown: 2, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (suffix && suffix.trim().replace("\"", "") === "channel") bot.sendMessage(msg, "This channel's ID is: " + msg.channel.id);
			else bot.sendMessage(msg, "Your ID is: " + msg.author.id);
		}
	},
	"beep": {
		desc: "boop", usage: "", deleteCommand: false, cooldown: 3, shouldDisplay: false,
		process: (bot, msg) => { bot.sendMessage(msg, "boop", (e,sentMsg)=>{bot.updateMessage(sentMsg, "boop    |    Time taken: " + (sentMsg.timestamp - msg.timestamp) + "ms")}); }
	},
	"poi": {
		desc: "poi", usage: "", deleteCommand: false, cooldown: 3, shouldDisplay: false,
		process: (bot, msg) => { bot.sendMessage(msg, "Poi!"); }
	},
	"ping": {
		desc: "Replies with pong.",
		info: "You can use this to check how long it take the bot to detect a message and respond.",
		cooldown: 3, shouldDisplay: false, usage: "",
		process: function(bot, msg) {
			var n = Math.floor(Math.random() * 6);
			if (n === 0) { bot.sendMessage(msg, "pong", (e,sentMsg)=>{bot.updateMessage(sentMsg, "pong    |    Time taken: " + (sentMsg.timestamp - msg.timestamp) + "ms")});
			} else if (n === 1) { bot.sendMessage(msg, "You thought I'd say pong, *didn't you?*", (e,sentMsg)=>{bot.updateMessage(sentMsg, "You thought I'd say pong, *didn't you?*    |    Time taken: " + (sentMsg.timestamp - msg.timestamp) + "ms")});
			} else if (n === 2) { bot.sendMessage(msg, "pong!", (e,sentMsg)=>{bot.updateMessage(sentMsg, "pong!    |    Time taken: " + (sentMsg.timestamp - msg.timestamp) + "ms")});
			} else if (n === 3) { bot.sendMessage(msg, "Yeah, I'm still here", (e,sentMsg)=>{bot.updateMessage(sentMsg, "Yeah, I'm still here    |    Time taken: " + (sentMsg.timestamp - msg.timestamp) + "ms")});
			} else if (n === 4) { bot.sendMessage(msg, "...", (e,sentMsg)=>{bot.updateMessage(sentMsg, "...    |    Time taken: " + (sentMsg.timestamp - msg.timestamp) + "ms")});
			} else if (n === 5) { bot.sendMessage(msg, config.command_prefix + "ping", (e,sentMsg)=>{bot.updateMessage(sentMsg, "ping    |    Time taken: " + (sentMsg.timestamp - msg.timestamp) + "ms")}); }
		}
	},
	"invite": {
		desc: "Get my invite link", usage: "", deleteCommand: true,
		process: function(bot, msg) {
			bot.sendMessage(msg, "Use this to bring me to your server: <https://discordapp.com/oauth2/authorize?&client_id=" + config.app_id + "&scope=bot&permissions=12659727&redirect_uri=http://brussell98.github.io/bot/commands.html&response_type=code>");
		}
	},
	"about": {
		desc: "About me",
		deleteCommand: true, cooldown: 10, usage: "",
		process: function(bot, msg) {
			bot.sendMessage(msg, "__Author:__ Brussell\n__Library:__ Discord.js\n__Version:__ " + version + "\n__Official Server:__ <https://discord.gg/0kvLlwb7slG3XCCQ>\n__Info and Commands:__  <http://brussell98.github.io/bot/index.html>");
		}
	},
	"dice": {
		desc: "Roll dice. (1d6 by default)",
		deleteCommand: true, cooldown: 3,
		usage: "[(rolls)d(sides)]",
		info: "__Format:__ The first number is how many to roll. The second is the number of sides.",
		process: function(bot, msg, suffix) {
			var dice = (suffix && /\d+d\d+/.test(suffix)) ? suffix : "1d6";
			request("https://rolz.org/api/?" + dice + ".json", function(err, response, body) {
				if (!err && response.statusCode == 200) {
					var roll = JSON.parse(body);
					if (roll.details == null) { bot.sendMessage(msg, roll.result, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (roll.details.length <= 100) bot.sendMessage(msg, "🎲 Your **" + roll.input + "** resulted in " + roll.result + " " + roll.details);
					else bot.sendMessage(msg, "🎲 Your **" + roll.input + "** resulted in " + roll.result);
				} else console.log(cWarn(" WARN ") + " Got an error: " + err + ", status code: ", response.statusCode);
			});
		}
	},
	"roll": {
		desc: "Pick a random number",
		deleteCommand: true,
		usage: "[max]",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			var roll = 100;
			try {
				if (suffix && /\d+/.test(suffix)) { roll = parseInt(suffix.replace(/[^\d]/g, "")); }
			} catch (err) { console.log(cError(" ERROR ") + " " + err); bot.sendMessage(msg, "⚠ Error parsing suffix into int", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			bot.sendMessage(msg, msg.author.username.replace(/@/g, '@\u200b') + " rolled **1-" + roll + "** and got " + Math.floor((Math.random() * (roll)) + 1));
		}
	},
	"joinedat": {
		desc: "Check when a user joined the server", usage: "[user]",
		deleteCommand: true, cooldown: 5,
		process: function(bot, msg, suffix) {
			if (msg.mentions.length > 0) {
				if (msg.mentions.length > 4) bot.sendMessage(msg, "Limit of 4 users at once", (e, m)=>{bot.deleteMessage(m,{"wait": 10000});});
				msg.mentions.map(user=>{
					var toSend = [];
					var detailsOf = msg.channel.server.detailsOfUser(user);
					if (detailsOf) toSend.push("**" + user.username.replace(/@/g, '@\u200b') + " joined on:** " + new Date(detailsOf.joinedAt).toUTCString());
					else toSend.push("**" + user.username.replace(/@/g, '@\u200b') + " joined on:** Error user is undefined");
					bot.sendMessage(msg, toSend);
				});
			} else if (suffix) {
				var users = suffix.split(/, ?/);
				if (users.length > 4) { bot.sendMessage(msg, "Limit of 4 users at once", (erro, wMessage)=>{ bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var toSend = [];
				users.map(user=>{
					var usr = findUser(msg.channel.server.members, user);
					if (usr) {
						var detailsOf = msg.channel.server.detailsOfUser(usr);
						if (detailsOf) toSend.push("**" + usr.username.replace(/@/g, '@\u200b') + " joined on:** " + new Date(detailsOf.joinedAt).toUTCString());
						else toSend.push("**" + usr.username.replace(/@/g, '@\u200b') + " joined on:** Error user is undefined");
					} else toSend.push("User \"" + user.replace(/@/g, '@\u200b') + "\" not found");
				});
				bot.sendMessage(msg, toSend);
			} else {
				var detailsOf = msg.channel.server.detailsOfUser(msg.author);
				if (detailsOf) bot.sendMessage(msg, "**" + msg.author.username.replace(/@/g, '@\u200b') + " joined on:** " + new Date(detailsOf.joinedAt).toUTCString());
				else bot.sendMessage(msg, "**" + msg.author.username.replace(/@/g, '@\u200b') + " joined on:** Error user is undefined");
			}
		}
	},
	"info": {
		desc: "Gets info on the server or a user if mentioned.",
		usage: "[username]",
		deleteCommand: true, cooldown: 10,
		info: "If no suffix is provided it will get info on the server.\nIf a user is provided it will get info on them.\nSome stats include: roles, join date, avatar, creation date, members, region, and owner.",
		process: function(bot, msg, suffix) {
			if (!msg.channel.isPrivate) {
				if (suffix) {
					if (msg.mentions.length > 0) {
						if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username.replace(/@/g, '@\u200b') + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						if (msg.mentions.length > 4) { bot.sendMessage(msg, "Limit of 4 users", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						msg.mentions.map(function(usr) {
							var toSend = [], count = 0;
							toSend.push("**Info on** " + usr.username + "#" + usr.discriminator + " (ID: " + usr.id + ") 🕵🏻");
							if (usr.game && usr.game.name !== undefined && usr.game.name !== null && usr.game.name !== "null") toSend.push("**Status:** " + usr.status + " **last playing** " + usr.game.name);
							else toSend.push("**Status:** " + usr.status);
							var detailsOf = msg.channel.server.detailsOfUser(usr);
							if (detailsOf) toSend.push("**Joined on:** " + new Date(detailsOf.joinedAt).toUTCString());
							else toSend.push("**Joined on:** Error");
							if (msg.channel.server.rolesOfUser(usr.id) != undefined) {
								var roles = msg.channel.server.rolesOfUser(usr.id).map(role=>role.name);
								if (roles) {
									roles = roles.join(", ").replace(/@/g, '@\u200b');
									if (roles && roles !== "")
										if (roles.length <= 1500) { toSend.push("**Roles:** `" + roles + "`"); } else { toSend.push("**Roles:** `" + roles.split(", ").length + "`"); }
									else
										toSend.push("**Roles:** `none`");
								} else toSend.push("**Roles:** Error");
							} else toSend.push("**Roles:** Error");
							bot.servers.map(server=>{ if (server.members.indexOf(usr) > -1) { count += 1; }});
							if (count > 1) { toSend.push("**Shared servers:** " + count); }
							toSend.push("**Account created on** " + new Date((usr.id / 4194304) + 1420070400000));
							bot.sendMessage(msg, toSend);
						});
					} else {
						if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username.replace(/@/g, '@\u200b') + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						var users = suffix.split(/, ?/);
						if (users.length > 4) { bot.sendMessage(msg, "Limit of 4 users", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						users.map(function(user) {
							var usr = findUser(msg.channel.server.members, user);
							if (usr) {
								var toSend = [], count = 0;
								toSend.push("**Info on** " + usr.username + "#" + usr.discriminator + " (ID: " + usr.id + ") 🕵🏻");
								if (usr.game && usr.game.name !== undefined && usr.game.name !== null && usr.game.name !== "null") toSend.push("**Status:** " + usr.status + " **last playing** " + usr.game.name);
								else toSend.push("**Status:** " + usr.status);
								var detailsOf = msg.channel.server.detailsOfUser(usr);
								if (detailsOf) toSend.push("**Joined on:** " + new Date(detailsOf.joinedAt).toUTCString());
								else toSend.push("**Joined on:** Error");
								if (msg.channel.server.rolesOfUser(usr.id) != undefined) {
									var roles = msg.channel.server.rolesOfUser(usr.id).map(role=>role.name);
									if (roles) {
										roles = roles.join(", ").replace(/@/g, '@\u200b');
										if (roles && roles !== "")
											if (roles.length <= 1500) { toSend.push("**Roles:** `" + roles + "`"); } else { toSend.push("**Roles:** `" + roles.split(", ").length + "`"); }
										else
											toSend.push("**Roles:** `none`");
									} else toSend.push("**Roles:** Error");
								} else toSend.push("**Roles:** Error");
								bot.servers.map(server=>{ if (server.members.indexOf(usr) > -1) { count += 1; }});
								if (count > 1) { toSend.push("**Shared servers:** " + count); }
								toSend.push("**Account created on** " + new Date((usr.id / 4194304) + 1420070400000));
								bot.sendMessage(msg, toSend);
							} else bot.sendMessage(msg, "User \"" + user + "\" not found. If you want to get info on multiple users separate them with a comma.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); });
						});
					}
				} else {
					var toSend = [];
					toSend.push("**Info on** " + msg.channel.server.name + " (" + msg.channel.server.id + ") 🕵🏻");
					toSend.push("**Owner:** " + msg.channel.server.owner.username + " (**ID:** " + msg.channel.server.owner.id + ")");
					toSend.push("**Region:** " + msg.channel.server.region);
					toSend.push("**Members:** " + msg.channel.server.members.length + " **Channels:** " + msg.channel.server.channels.filter(c=>c.type=="text").length + "T " + msg.channel.server.channels.filter(c=>c.type=="voice").length + "V");
					toSend.push("**Server created on** " + new Date((msg.channel.server.id / 4194304) + 1420070400000));
					var roles = msg.channel.server.roles.map(role=>role.name);
					roles = roles.join(", ").replace(/@/g, '@\u200b');
					if (roles.length <= 1500) toSend.push("**Roles:** `" + roles + "`");
					else toSend.push("**Roles:** `" + roles.split(", ").length + "`");
					toSend.push("**Default channel:** " + msg.channel.server.defaultChannel);
					toSend.push("**Icon URL:** `" + msg.channel.server.iconURL + "`");
					bot.sendMessage(msg, toSend);
				}
			} else bot.sendMessage(msg, "Can't do that in a DM.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
		}
	},
	"avatar": {
		desc: "Get a link to a user's avatar. Can use a comma for multiple users.",
		usage: "@mention OR username",
		deleteCommand: true,
		cooldown: 6,
		process: function(bot, msg, suffix) {
			if (msg.channel.isPrivate) {
				if (msg.author.avatarURL != null) { bot.sendMessage(msg, "I can only get your avatar in a direct message. Here it is: " + msg.author.avatarURL); return; }
				if (msg.author.avatarURL == null) { bot.sendMessage(msg, "I can only get your avatar in a direct message, but you don't have one"); return; }
			}
			if (msg.mentions.length == 0 && !suffix) { (msg.author.avatarURL != null) ? bot.sendMessage(msg, msg.author.username + "'s avatar: " + msg.author.avatarURL) : bot.sendMessage(msg, msg.author.username + " has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else if (msg.mentions.length > 0) {
				if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username.replace(/@/g, '@\u200b') + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (msg.mentions.length > 6) { bot.sendMessage(msg, "Limit of 6 users", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				msg.mentions.map(function(usr) {
					(usr.avatarURL != null) ? bot.sendMessage(msg, "**" + usr.username.replace(/@/g, '@\u200b') + "**'s avatar: " + usr.avatarURL + "") : bot.sendMessage(msg, "**" + usr.username + "** has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
				});
			} else {
				if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username.replace(/@/g, '@\u200b') + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var users = suffix.split(/, ?/);
				if (users.length > 6) { bot.sendMessage(msg, "Limit of 6 users", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				users.map(function(user) {
					var usr = findUser(msg.channel.server.members, user);
					if (usr) { (usr.avatarURL != null) ? bot.sendMessage(msg, "**" + usr.username.replace(/@/g, '@\u200b') + "**'s avatar: " + usr.avatarURL + "") : bot.sendMessage(msg, "**" + usr.username + "** has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
					} else { bot.sendMessage(msg, "User \"" + user + "\" not found. If you want to get the avatar of multiple users separate them with a comma.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 20000}); }); }
				});
			}
		}
	},
	"choose": {
		desc: "Makes a choice for you.",
		usage: "<option 1>, <option 2>, [option], [option]",
		cooldown: 4, deleteCommand: false,
		process: function(bot, msg, suffix) {
			if (!suffix || /(.*), ?(.*)/.test(suffix) == false) { correctUsage("choose", this.usage, msg, bot); return; }
			var choices = suffix.split(/, ?/);
			if (choices.length < 2) correctUsage("choose", this.usage, msg, bot);
			else {
				var choice = Math.floor(Math.random() * (choices.length));
				choices.forEach((c,i)=>{if (c.indexOf('homework') > -1 || c.indexOf('sleep') > -1) choice = i;});
				bot.sendMessage(msg, "I chose **" + choices[choice].replace(/@/g, '@\u200b') + "**");
			}
		}
	},
	"lotto": {
		desc: "Lottery picks a random entered user.",
		usage: "end | enter | new [max entries] | <mentions to pick from> (pick from the users mentioned) | everyone",
		deleteCommand: true, cooldown: 2,
		info: "__new__: Start a lottery with the specified number as the max entries per user.\n__mentions__: Pick from the mentioned users.\n__everyone__: Pick a random person on the server.",
		process: function(bot, msg, suffix) {
			var currentchannel = msg.channel.id;
			if (msg.everyoneMentioned || suffix.toLowerCase() == "everyone") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
				if (LottoDB.hasOwnProperty(msg.channel.id)) { bot.sendMessage(msg, "There is already a lottery running!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.sendMessage(msg, "🎊 Out of " + msg.channel.server.members.length + " members on this server, " + msg.channel.server.members.random().username + " is the winner! 🎊");

			} else if (suffix.split(" ")[0] == "new") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
				if (suffix.length > 1) {
					var maxentries = (/^\d+$/.test(suffix.split(" ")[1])) ? parseInt(suffix.split(" ")[1]) : 1;
				}
				if (LottoDB.hasOwnProperty(currentchannel)) {
					bot.sendMessage(msg.channel, "Lottery already running, please wait for it to end.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
				} else {
					bot.sendMessage(msg, "New lottery started by **" + msg.author.username + "** (max entries per user: " + maxentries + "). Use `" + config.command_prefix + "lotto enter` to enter.");
					var object = {"max": maxentries, "msg": msg, "entries": "", "starter": msg.author.id};
					LottoDB[currentchannel] = [];
					LottoDB[currentchannel][0] = object;
					if (suffix.indexOf("-noautoend") == -1) { autoEndLotto(bot, msg); }
				}

			} else if (suffix.replace(" ", "") == "end") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
				if (LottoDB.hasOwnProperty(msg.channel.id)) {
					if (msg.author.id == LottoDB[currentchannel][0].starter || msg.channel.permissionsOf(msg.author).hasPermission("manageChannel")) {
						if (LottoDB[currentchannel][0].entries.split(",").length < 3) {
							bot.sendMessage(msg, "Lottery ended but there have to be two entries into the lottery for a winner to be picked.");
							delete LottoDB[currentchannel];
						} else {
							var winner = msg.channel.server.members.get("id", LottoDB[currentchannel][0].entries.split(",")[Math.floor((Math.random() * (LottoDB[currentchannel][0].entries.split(",").length - 1)) + 1)]);
							bot.sendMessage(msg, "🎊 Out of **" + (LottoDB[currentchannel][0].entries.split(",").length - 1) + "** entries the winner is " + winner + " 🎊");
							delete LottoDB[currentchannel];
						}
					} else { bot.sendMessage(msg, "Only the person that started the lottery can end it!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				} else { bot.sendMessage(msg, "There isn't a lottery running in this channel!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }

			} else if (suffix.replace(" ", "") == "enter") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
				if (LottoDB.hasOwnProperty(currentchannel)) {
					if (LottoDB[currentchannel][0].entries.split(",").indexOf(msg.author.id) > -1) {
						if (LottoDB[currentchannel][0].max < 2) { bot.sendMessage(msg.channel, "You can only enter this lottery **1** time.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						if (LottoDB[currentchannel][0].entries.split(",").filter(function(value) { return value == msg.author.id; }).length >= LottoDB[currentchannel][0].max) { bot.sendMessage(msg.channel, "You can only enter this lottery **" + LottoDB[currentchannel][0].max + "** times.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						LottoDB[currentchannel][0].entries = LottoDB[currentchannel][0].entries + "," + msg.author.id;
						bot.sendMessage(msg.channel, "Added " + msg.author.username + " to the lottery");
					} else {
						LottoDB[currentchannel][0].entries = LottoDB[currentchannel][0].entries + "," + msg.author.id;
						bot.sendMessage(msg.channel, "Added " + msg.author.username + " to the lottery");
						return;
					}
				} else { bot.sendMessage(msg.channel, "No lottery to enter!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }

			} else if (msg.mentions.length > 0) {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
				if (msg.mentions.length < 2) { bot.sendMessage(msg, "You need to enter multiple users!"); return; }
				var choice = Math.floor(Math.random() * msg.mentions.length);
				bot.sendMessage(msg, " 🎊Out of **" + msg.mentions.length + "** entries the winner is " + msg.mentions[choice] + " 🎊");

			} else correctUsage("lotto", this.usage, msg, bot);
		}
	},
	"vote": {
		desc: "Start / end a vote, or vote on one.",
		usage: "+/- | new <topic> [-noautoend] | end",
		deleteCommand: true,
		process: function(bot, msg, suffix) {
			var currentChannel = msg.channel.id;
			if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
			if (suffix.split(" ")[0] == "new") {

				if (VoteDB.hasOwnProperty(currentChannel)) { bot.sendMessage(msg, "There is already a vote pending!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var topic = (suffix.replace(" -noautoend", "").split(" ").length > 1) ? suffix.replace(" -noautoend", "").substring(4).replace(/@/g, '@\u200b') : "None";
				bot.sendMessage(msg, "🗳 New vote started by **" + msg.author.username.replace(/@/g, '@\u200b') + "**. Topic: `" + topic + "`. To vote say `" + config.command_prefix + "vote +/-`\nUpvotes: 0\nDownvotes: 0", function(err, message) {
					if (err) { bot.sendMessage(msg, err); return; }
					var object = {"topic": topic, "annMsg": message, "upvoters": "", "downvoters": "", "upvotes": 0, "downvotes": 0, "starter": msg.author.id};
					VoteDB[currentChannel] = [];
					VoteDB[currentChannel][0] = object;
					if (suffix.indexOf("-noautoend") == -1) { autoEndVote(bot, msg); }
				});

			} else if (suffix.replace(" ", "") == "end") {

				if (!VoteDB.hasOwnProperty(currentChannel)) { bot.sendMessage(msg, "There isn't a vote to end!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (msg.author.id == VoteDB[currentChannel][0].starter || msg.channel.permissionsOf(msg.author).hasPermission("manageChannel")) {
					bot.deleteMessage(VoteDB[currentChannel][0].annMsg);
					bot.sendMessage(msg, "**Results of last vote:**\nTopic: `" + VoteDB[currentChannel][0].topic + "`\nUpvotes: `" + VoteDB[currentChannel][0].upvotes + " " + Math.round((VoteDB[currentChannel][0].upvotes / (VoteDB[currentChannel][0].upvotes + VoteDB[currentChannel][0].downvotes)) * 100) + "%`\nDownvotes: `" + VoteDB[currentChannel][0].downvotes + " " + Math.round((VoteDB[currentChannel][0].downvotes / (VoteDB[currentChannel][0].upvotes + VoteDB[currentChannel][0].downvotes)) * 100) + "%`");
					delete VoteDB[currentChannel];
				} else { bot.sendMessage(msg, "Only the person that started the vote can end it!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }

			} else if (suffix.replace(" ", "") == "+" || suffix.replace(" ", "") == "-") {

				if (VoteDB.hasOwnProperty(currentChannel) == false) { bot.sendMessage(msg, "There isn't a vote to vote on!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (suffix.replace(" ", "") == "+") {
					if (VoteDB[currentChannel][0].upvoters.indexOf(msg.author.id) > -1) { return; }
					if (VoteDB[currentChannel][0].downvoters.indexOf(msg.author.id) > -1) {
						VoteDB[currentChannel][0].upvoters += "," + msg.author.id;
						VoteDB[currentChannel][0].upvotes += 1;
						VoteDB[currentChannel][0].downvoters = VoteDB[currentChannel][0].upvoters.replace("," + msg.author.id, "");
						VoteDB[currentChannel][0].downvotes -= 1;
						bot.updateMessage(VoteDB[currentChannel][0].annMsg, VoteDB[currentChannel][0].annMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: " + VoteDB[currentChannel][0].upvotes + "\nDownvotes: " + VoteDB[currentChannel][0].downvotes), function(err, message) { VoteDB[currentChannel][0].annMsg = message; });
					} else {
						VoteDB[currentChannel][0].upvoters += "," + msg.author.id;
						VoteDB[currentChannel][0].upvotes += 1;
						bot.updateMessage(VoteDB[currentChannel][0].annMsg, VoteDB[currentChannel][0].annMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: " + VoteDB[currentChannel][0].upvotes + "\nDownvotes: " + VoteDB[currentChannel][0].downvotes), function(err, message) { VoteDB[currentChannel][0].annMsg = message; });
					}
				} else if (suffix.replace(" ", "") == "-") {
					if (VoteDB[currentChannel][0].downvoters.indexOf(msg.author.id) > -1) { return; }
					if (VoteDB[currentChannel][0].upvoters.indexOf(msg.author.id) > -1) {
						VoteDB[currentChannel][0].downvoters += "," + msg.author.id;
						VoteDB[currentChannel][0].downvotes += 1;
						VoteDB[currentChannel][0].upvoters = VoteDB[currentChannel][0].upvoters.replace("," + msg.author.id, "");
						VoteDB[currentChannel][0].upvotes -= 1;
						bot.updateMessage(VoteDB[currentChannel][0].annMsg, VoteDB[currentChannel][0].annMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: " + VoteDB[currentChannel][0].upvotes + "\nDownvotes: " + VoteDB[currentChannel][0].downvotes), function(err, message) { VoteDB[currentChannel][0].annMsg = message; });
					} else {
						VoteDB[currentChannel][0].downvoters += "," + msg.author.id;
						VoteDB[currentChannel][0].downvotes += 1;
						bot.updateMessage(VoteDB[currentChannel][0].annMsg, VoteDB[currentChannel][0].annMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: " + VoteDB[currentChannel][0].upvotes + "\nDownvotes: " + VoteDB[currentChannel][0].downvotes), function(err, message) { VoteDB[currentChannel][0].annMsg = message; });
					}
				}
			} else correctUsage("vote", this.usage, msg, bot);
		}
	},
	"strawpoll": {
		desc: "Create a strawpoll",
		deleteCommand: true,
		usage: "<option1>, <option2>, [option3], ...",
		cooldown: 15,
		process: function(bot, msg, suffix) {
			if (suffix && /^[^, ](.*), ?(.*)[^, ]$/.test(suffix)) {
				suffix = msg.cleanContent.substring(msg.cleanContent.indexOf(" ") + 1).split(/, ?/);
				request.post({
						url: "https://strawpoll.me/api/v2/polls",
						headers: {"content-type": "application/json"},
						json: true,
						body: {
							"title": "" + msg.author.username + "'s Poll",
							"options": suffix
						},
						followAllRedirects: true
					}, (error, response, body) => {
						if (!error && response.statusCode == 200) bot.sendMessage(msg, msg.author.username.replace(/@/g, '@\u200b') + " created a strawpoll. Vote here: <http://strawpoll.me/" + body.id + ">");
						else if (error) bot.sendMessage(msg, error);
						else if (response.statusCode != 200) bot.sendMessage(msg, "Got status code " + response.statusCode);
					}
				);
			} else correctUsage("strawpoll", this.usage, msg, bot);
		}
	},
	"8ball": {
		desc: "It's an 8ball...",
		usage: "[question]",
		cooldown: 4,
		process: function(bot, msg) {
			var responses = ["It is certain", "Without a doubt", "You may rely on it", "Most likely", "Yes", "Signs point to yes", "Better not tell you now", "Don't count on it", "My reply is no", "My sources say no", "Outlook not so good", "Very doubtful"];
			bot.sendMessage(msg, "🎱 " + responses[Math.floor(Math.random() * (responses.length))]);
		}
	},
	"anime": {
		desc: "Get details on an anime from MAL.",
		usage: "<anime name>",
		deleteCommand: true,
		cooldown: 6,
		process: function(bot, msg, suffix) {
			if (suffix) {
				if (!MAL_USER || !MAL_PASS || MAL_USER == "" || MAL_PASS =="") { bot.sendMessage(msg, "MAL login not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = ent.encodeHTML(suffix);
				var rUrl = "http://myanimelist.net/api/anime/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": MAL_USER, "pass": MAL_PASS, "sendImmediately": false}}, function(error, response, body) {
					if (error) console.log(error);
					else if (!error && response.statusCode == 200) {
						xml2js.parseString(body, function(err, result) {
							var title = result.anime.entry[0].title;
							var english = result.anime.entry[0].english;
							var ep = result.anime.entry[0].episodes;
							var score = result.anime.entry[0].score;
							var type = result.anime.entry[0].type;
							var status = result.anime.entry[0].status;
							var synopsis = result.anime.entry[0].synopsis.toString();
							var id = result.anime.entry[0].id;
							synopsis = synopsis.replace(/<br \/>/g, " ").replace(/\[(.{1,10})\]/g, "").replace(/\r?\n|\r/g, " ").replace(/\[(i|\/i)\]/g, "*").replace(/\[(b|\/b)\]/g, "**");
							synopsis = ent.decodeHTML(synopsis);
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) synopsis = synopsis.substring(0, 400); synopsis += "...";
							}
							bot.sendMessage(msg, "**" + title + " / " + english + "**\n**Type:** " + type + " **| Episodes:** " + ep + " **| Status:** " + status + " **| Score:** " + score + "\n" + synopsis + "\n**<http://www.myanimelist.net/anime/" + id + ">**");
						});
					} else bot.sendMessage(msg, "\"" + suffix + "\" not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
				});
				bot.stopTyping(msg.channel);
			} else correctUsage("anime", this.usage, msg, bot);
		}
	},
	"manga": {
		desc: "Get details on a manga from MAL.",
		usage: "<manga/novel name>",
		deleteCommand: true,
		cooldown: 6,
		process: function(bot, msg, suffix) {
			if (suffix) {
				if (!MAL_USER || !MAL_PASS || MAL_USER == "" || MAL_PASS =="") { bot.sendMessage(msg, "MAL login not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = ent.encodeHTML(suffix);
				var rUrl = "http://myanimelist.net/api/manga/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": MAL_USER, "pass": MAL_PASS, "sendImmediately": false}}, function(error, response, body) {
					if (error) console.log(error);
					else if (!error && response.statusCode == 200) {
						xml2js.parseString(body, function(err, result) {
							var title = result.manga.entry[0].title;
							var english = result.manga.entry[0].english;
							var chapters = result.manga.entry[0].chapters;
							var volumes = result.manga.entry[0].volumes;
							var score = result.manga.entry[0].score;
							var type = result.manga.entry[0].type;
							var status = result.manga.entry[0].status;
							var synopsis = result.manga.entry[0].synopsis.toString();
							var id = result.manga.entry[0].id;
							synopsis = synopsis.replace(/<br \/>/g, " ").replace(/\[(.{1,10})\]/g, "").replace(/\r?\n|\r/g, " ").replace(/\[(i|\/i)\]/g, "*").replace(/\[(b|\/b)\]/g, "**");
							synopsis = ent.decodeHTML(synopsis);
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) synopsis = synopsis.substring(0, 400) + "...";
							}
							bot.sendMessage(msg, `**${title} / ${english}**
								**Type:** ${type} **| Chapters:** ${chapters} **| Volumes:** ${volumes} **| Status:** ${status} **| Score:** ${score}
								${synopsis}
								**<http://www.myanimelist.net/manga/${id}>**`);
						});
					} else bot.sendMessage(msg, "\"" + suffix + "\" not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
				});
				bot.stopTyping(msg.channel);
			} else correctUsage("manga", this.usage, msg, bot);
		}
	},
	"maluser": {
		desc: "Get details on a user's MAL.", usage: "<username>",
		deleteCommand: true, cooldown: 6,
		process: function(bot, msg, suffix) {
			if (suffix) {
				var rUrl = "http://myanimelist.net/malappinfo.php?u=" + ent.encodeHTML(suffix) + "&status=all&type=anime";
				request(rUrl, (error, response, body) => {
					if (error) console.log(error);
					else if (!error && response.statusCode == 200) {
						xml2js.parseString(body, (err, result) => {
							if (err) console.log(err);
							else if (!result.myanimelist.myinfo) bot.sendMessage(msg, result.myanimelist.error, (e, m)=>{bot.deleteMessage(m, {"wait": 8000});});
							else {
								result = result.myanimelist.myinfo[0];
								bot.sendMessage(msg, `\`\`\`ruby
									User: ${result.user_name} (${result.user_id})
									Watching: ${result.user_watching}
									Completed: ${result.user_completed}
									On Hold: ${result.user_onhold}
									Dropped: ${result.user_dropped}
									PTW: ${result.user_plantowatch}
									Days Spent Watching: ${result.user_days_spent_watching}
									\`\`\``);
							}
						});
					}
				});
			} else correctUsage("maluser", this.usage, msg, bot);
		}
	},
	"coinflip": {
		desc: "Flip a coin.", usage: "",
		deleteCommand: true, cooldown: 2,
		process: function(bot, msg) {
			if (Math.floor(Math.random() * (2)) == 0) bot.sendMessage(msg, "**" + msg.author.username.replace(/@/g, '@\u200b') + "** flipped a coin and got **Heads**");
			else bot.sendMessage(msg, "**" + msg.author.username.replace(/@/g, '@\u200b') + "** flipped a coin and got **Tails**");
		}
	},
	"osu": {
		desc: "Commands to fetch osu! data.",
		usage: "[mode] sig [username] [hex color] | [mode] <user|best|recent> [username]",
		info: "**sig:** Get an osu!next styled signature for the specified account. You may provide a hex color.\n**user:** Get the statistics for a user.\n**best:** Get the top 5 plays for a user (by PP).\n**recent:** Get the 5 most recent plays for a user.\n**mode:** Mode can be used if you want to get data for a mode other than osu. You can use mania, taiko, or ctb.",
		deleteCommand: true, cooldown: 5,
		process: function(bot, msg, suffix) {
			if (!suffix) { correctUsage("osu", this.usage, msg, bot); return; }

			var osu;
			if (/^(osu!?)?(standard|mania|taiko|ctb|catch the beat) .{3,6} /i.test(suffix)) {
				if (suffix.replace(/^(osu!?)?(standard|mania|taiko|ctb|catch the beat) /i, '').startsWith('sig')) {
					if (/^(osu!?)?mania/i.test(suffix)) osu = "3";
					else if (/^(osu!?)?(ctb|catch the beat)/i.test(suffix)) osu = "2";
					else if (/^(osu!?)?taiko/i.test(suffix)) osu = "1";
				} else {
					if (!OSU_API_KEY || OSU_API_KEY == "") { bot.sendMessage(msg, "Osu API key not configured by bot owner", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (/^(osu!?)?mania/i.test(suffix)) osu = new osuapi.Api(OSU_API_KEY, osuapi.Modes.osumania);
					else if (/^(osu!?)?(ctb|catch the beat)/i.test(suffix)) osu = new osuapi.Api(OSU_API_KEY, osuapi.Modes.CtB);
					else if (/^(osu!?)?taiko/i.test(suffix)) osu = new osuapi.Api(OSU_API_KEY, osuapi.Modes.taiko);
				}
				suffix = suffix.replace(/^(osu!?)?(standard|mania|taiko|ctb|catch the beat) /i, '');
			} else {
				if (suffix.startsWith("sig")) osu = false;
				else {
					if (!OSU_API_KEY || OSU_API_KEY == "") { bot.sendMessage(msg, "Osu API key not configured by bot owner", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					osu = new osuapi.Api(OSU_API_KEY);
				}
			}

			if (suffix.split(" ")[0] === "sig") {

				var color = "ff66aa",
					username = msg.author.username;
				suffix = suffix.split(" ");
				suffix.shift();
				if (suffix && suffix.length >= 1) {
					if (/(.*) #?[A-Fa-f0-9]{6}$/.test(suffix.join(" "))) {
						username = suffix.join("%20").substring(0, suffix.join("%20").lastIndexOf("%20"));
						if (suffix[suffix.length - 1].length == 6) { color = suffix[suffix.length - 1];
						} else if (suffix[suffix.length - 1].length == 7) { color = suffix[suffix.length - 1].substring(1); }
					} else if (/#?[A-Fa-f0-9]{6}$/.test(suffix.join(" "))) {
						username = msg.author.username;
						if (suffix[0].length == 6) { color = suffix[0];
						} else if (suffix[0].length == 7) { color = suffix[0].substring(1); }
					} else { username = suffix.join("%20"); }
				}
				var url = "https://lemmmy.pw/osusig/sig.php?colour=hex" + color + "&uname=" + username + "&pp=2&flagshadow&xpbar&xpbarhex&darktriangles";
				if (osu) url += "&mode=" + osu;
				request({url: url, encoding: null}, (err, response, body) => {
					if (err) { bot.sendMessage(msg, "Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (response.statusCode != 200) { bot.sendMessage(msg, "Got status code " + response.statusCode, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					bot.sendMessage(msg, "Here's your osu signature for **" + username.replace(/@/g, '@\u200b') + "**! Get a live version at `lemmmy.pw/osusig/`");
					bot.sendFile(msg, body, "sig.png");
				});

			} else if (suffix.split(" ")[0] == "user") {

				var username = (suffix.split(" ").length < 2) ?  msg.author.username : suffix.substring(5);
				osu.getUser(username, (err, data) => {
					if (err) bot.sendMessage(msg, "Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
					if (!data) bot.sendMessage(msg, "User \"" + username + "\" not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
					else {
						if (data.playcount === null || data.playcount == 0) { bot.sendMessage(msg, "User has no data", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
						var toSend = [];
						toSend.push("User: " + data.username.replace(/@/g, '@\u200b') + " (" + data.country + ")");
						toSend.push("Play Count: " + data.playcount.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Level: " + data.level.substring(0, data.level.split(".")[0].length + 3));
						toSend.push("Ranked Score: " + data.ranked_score.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
						toSend.push("Total Score: " + data.total_score.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
						toSend.push("PP: " + data.pp_raw.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ","));
						toSend.push("Rank: #" + data.pp_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " (Country Rank: #" + data.pp_country_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + ")");
						toSend.push("Accuracy: " + data.accuracy.substring(0, data.accuracy.split(".")[0].length + 3) + "%");
						toSend.push("300s: " + data.count300.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | 100s: " + data.count100.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | 50s: " + data.count50.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | SS: " + data.count_rank_ss + " | S: " + data.count_rank_s + " | A: " + data.count_rank_a.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
						bot.sendMessage(msg, "```xl\n" + toSend.join('\n') + "```");
					}
				});

			} else if (suffix.split(" ")[0] === "best") {

				var username = (suffix.split(" ").length < 2) ?  msg.author.username : suffix.substring(5);
				osu.getUserBest(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0] || !data[1] || !data[2] || !data[3] || !data[4]) { bot.sendMessage(msg, "User \"" + username + "\" not found or user doesn't have 5 plays", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var toSend = [];
					toSend.push("```ruby\nTop 5 for " + username.replace(/@/g, '@\u200b') + ":");
					osu.getBeatmap(data[0].beatmap_id, (err, map1) => {

						toSend.push("1.# " + map1.title + " (☆" + map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length + 3) + ")\n\tPP: " + Math.round(data[0].pp.split(".")[0]) + " | Rank: " + data[0].rank + " | Score: " + data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Max Combo: " + data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[0].countmiss + " | Date: " + data[0].date);

						osu.getBeatmap(data[1].beatmap_id, (err, map2) => {

							toSend.push("2.# " + map2.title + " (☆" + map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length + 3) + ")\n\tPP: " + Math.round(data[1].pp.split(".")[0]) + " | Rank: " + data[1].rank + " | Score: " + data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Max Combo: " + data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[1].countmiss + " | Date: " + data[1].date);

							osu.getBeatmap(data[2].beatmap_id, (err, map3) => {

								toSend.push("3.# " + map3.title + " (☆" + map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length + 3) + ")\n\tPP: " + Math.round(data[2].pp.split(".")[0]) + " | Rank: " + data[2].rank + " | Score: " + data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Max Combo: " + data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[2].countmiss + " | Date: " + data[2].date);

								osu.getBeatmap(data[3].beatmap_id, (err, map4) => {

									toSend.push("4.# " + map4.title + " (☆" + map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length + 3) + ")\n\tPP: " + Math.round(data[3].pp.split(".")[0]) + " | Rank: " + data[3].rank + " | Score: " + data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Max Combo: " + data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[3].countmiss + " | Date: " + data[3].date);

									osu.getBeatmap(data[4].beatmap_id, (err, map5) => {

										toSend.push("5.# " + map5.title + " (☆" + map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length + 3) + ")\n\tPP: " + Math.round(data[4].pp.split(".")[0]) + " | Rank: " + data[4].rank + " | Score: " + data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Max Combo: " + data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[4].countmiss + " | Date: " + data[4].date);
										bot.sendMessage(msg, toSend.join("\n") + "```");
					});});});});});
				});

			} else if (suffix.split(" ")[0] === "recent") {

				var username = (suffix.split(" ").length < 2) ? msg.author.username : suffix.substring(7);
				osu.getUserRecent(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0]) { bot.sendMessage(msg, "User \"" + username + "\" not found or no recent plays", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var toSend = [];
					toSend.push("```ruby\n5 most recent plays for " + username.replace(/@/g, '@\u200b') + ":");
					osu.getBeatmap(data[0].beatmap_id, (err, map1) => {

						if (!map1 || !map1.title) { bot.sendMessage(msg, toSend + "```"); return; }
						toSend.push("1.# " + map1.title + " (☆" + map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length + 3) + ")\n\tScore: " + data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Rank: " + data[0].rank + " | Max Combo: " + data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[0].countmiss);
						if (!data[1]) { bot.sendMessage(msg, toSend.join("\n") + "```"); return; }

						osu.getBeatmap(data[1].beatmap_id, (err, map2) => {

							if (!map2 || !map2.title) { bot.sendMessage(msg, toSend); return; }
							toSend.push("2.# " + map2.title + " (☆" + map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length + 3) + ")\n\tScore: " + data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Rank: " + data[1].rank + " | Max Combo: " + data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[1].countmiss);
							if (!data[2]) { bot.sendMessage(msg, toSend.join("\n") + "```"); return; }

							osu.getBeatmap(data[2].beatmap_id, (err, map3) => {

								if (!map3 || !map3.title) { bot.sendMessage(msg, toSend); return; }
								toSend.push("3.# " + map3.title + " (☆" + map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length + 3) + ")\n\tScore: " + data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Rank: " + data[2].rank + " | Max Combo: " + data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[2].countmiss);
								if (!data[3]) { bot.sendMessage(msg, toSend.join("\n") + "```"); return; }

								osu.getBeatmap(data[3].beatmap_id, (err, map4) => {

									if (!map4 || !map4.title) { bot.sendMessage(msg, toSend); return; }
									toSend.push("4.# " + map4.title + " (☆" + map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length + 3) + ")\n\tScore: " + data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Rank: " + data[3].rank + " | Max Combo: " + data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[3].countmiss);
									if (!data[4]) { bot.sendMessage(msg, toSend.join("\n") + "```"); return; }

									osu.getBeatmap(data[4].beatmap_id, (err, map5) => {

										if (!map5 || !map5.title) { bot.sendMessage(msg, toSend); return; }
										toSend.push("5.# " + map5.title + " (☆" + map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length + 3) + ")\n\tScore: " + data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Rank: " + data[4].rank + " | Max Combo: " + data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | Misses: " + data[4].countmiss);
										bot.sendMessage(msg, toSend.join("\n") + "```");
					});});});});});
				});

			} else correctUsage("osu", this.usage, msg, bot, 15000);
		}
	},
	"rps": {
		desc: "Play Rock Paper Scissors",
		usage: "<rock/paper/scissors>",
		cooldown: 2,
		process: function(bot, msg) {
			var choice = Math.floor(Math.random() * 3);
			if (choice == 0) bot.sendMessage(msg, "I picked **rock**");
			else if (choice == 1) bot.sendMessage(msg, "I picked **paper**");
			else if (choice == 2) bot.sendMessage(msg, "I picked **scissors**");
		}
	},
	"weather": {
		desc: "Get the weather",
		usage: "<City/City,Us> or <zip/zip,us>",
		deleteCommand: true, cooldown: 7,
		info: "Formats: `London` `London,UK` `10016` `10016,NY`",
		process: function(bot, msg, suffix) {
			if (OWM_API_KEY == null || OWM_API_KEY == "") { bot.sendMessage(msg, "⚠ No API key defined by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (suffix) suffix = suffix.replace(" ", "");
			else { correctUsage("weather", this.usage, msg, bot); return; }
			var rURL = (/\d/.test(suffix) == false) ? "http://api.openweathermap.org/data/2.5/weather?q=" + suffix + "&APPID=" + OWM_API_KEY : "http://api.openweathermap.org/data/2.5/weather?zip=" + suffix + "&APPID=" + OWM_API_KEY;
			request(rURL, function(error, response, body) {
				if (!error && response.statusCode == 200) {
					body = JSON.parse(body);
					if (!body.hasOwnProperty("weather")) return;
					var tempF = Math.round(parseInt(body.main.temp) * (9 / 5) - 459.67) + " °F";
					var tempC = Math.round(parseInt(body.main.temp) - 273.15) + " °C";
					var windspeedUS = Math.round(parseInt(body.wind.speed) * 2.23694) + " mph";
					var windspeed = body.wind.speed + " m/s";
					var emoji = "☀";
					if (body.weather[0].description.indexOf("cloud") > -1) { emoji = "☁"; }
					if (body.weather[0].description.indexOf("snow") > -1) { emoji = "❄"; }
					if (body.weather[0].description.indexOf("rain") > -1 || body.weather[0].description.indexOf("storm") > -1 || body.weather[0].description.indexOf("drizzle") > -1) { emoji = "🌧"; }
					bot.sendMessage(msg, `${emoji} __Weather for ${body.name}__:
						**Conditions:** ${body.weather[0].description} **Temp:** ${tempF} / ${tempC}
						**Humidity:** ${body.main.humidity}% **Wind:** ${windspeedUS} / ${windspeed} **Cloudiness:** ${body.clouds.all}%`);
				} else console.log(error);
			});
		}
	},
	"google": {
		desc: "Let me Google that for you",
		deleteCommand: true,
		usage: "<search>",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, "<http://www.lmgtfy.com/?q=bot-chan+commands>"); return; }
			suffix = suffix.split(" ");
			for (var i = 0; i < suffix.length; i++) { suffix[i] = encodeURIComponent(suffix[i]); }
			bot.sendMessage(msg, `🔍 <http://www.lmgtfy.com/?q=${suffix.join("+")}>`);
		}
	},
	"numberfacts": {
		desc: "Get facts about a number",
		deleteCommand: true,
		usage: "[number]",
		cooldown: 2,
		process: function(bot, msg, suffix) {
			var number = "random";
			if (suffix && /^\d+$/.test(suffix)) { number = suffix; }
			request("http://numbersapi.com/" + number + "/trivia?json", function(error, response, body) {
				if (error) bot.sendMessage(msg, "Error: " + error, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); });
				else if (response.statusCode != 200) bot.sendMessage(msg, "Got status code " + response.statusCode, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); });
				else {
					body = JSON.parse(body);
					bot.sendMessage(msg, body.text);
				}
			});
		}
	},
	"catfacts": {
		desc: "Your healthy dose of cat facts.",
		usage: "",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg) {
			request("http://catfacts-api.appspot.com/api/facts", function(error, response, body) {
				if (error) bot.sendMessage(msg, "Error: " + error, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); });
				else if (response.statusCode != 200) bot.sendMessage(msg, "Got status code " + response.statusCode, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); });
				else {
					body = JSON.parse(body);
					bot.sendMessage(msg, "🐱 **" + msg.author.username.replace(/@/g, '@\u200b') + "**, did you know that " + body.facts[0]);
				}
			});
		}
	},
	"ratewaifu": {
		desc: "I'll rate your waifu",
		usage: "<name> [--s[earch]]",
		deleteCommand: false, cooldown: 5,
		process: function(bot, msg, suffix) {
			if (!suffix) { correctUsage("ratewaifu", this.usage, msg, bot); return; }
			if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username.replace(/@/g, '@\u200b') + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (msg.mentions.length > 1) { bot.sendMessage(msg, "Multiple mentions aren't allowed!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (suffix.toLowerCase().replace("-", " ") == bot.user.username.toLowerCase().replace("-", " ")) { bot.sendMessage(msg, "I'd rate myself **10/10**"); return; }
			var fullName = "", user = false;
			if (suffix.search(/--s(earch)?/i) > -1) {
				var showBase = (suffix.search(/--b(ase)?/i) > -1) ? true : false
					,query = suffix.replace(/--s(earch)?/i, '').replace(/--b(ase)?/i, '').toLowerCase().trim()
					,results = ["__Results:__"];
				Object.keys(waifus).map(name=>{if (name.toLowerCase().indexOf(query) > -1) (showBase) ? results.push(waifus[name] + ', ' + name) : results.push(name);});
				if (results.length > 1) {
					if (results.join('\n').length < 2000) bot.sendMessage(msg, results.join('\n'));
					else bot.sendMessage(msg, results.join('\n').substr(0,2000));
				} else bot.sendMessage(msg, "No names found matching that in the database");
			} else {
			if (!msg.channel.isPrivate) { user = msg.channel.server.members.find((member) => { return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase() == suffix.toLowerCase() }); } else user = false;
			if (!user && msg.mentions.length < 1) {
				Object.keys(waifus).map(name=>{if (name.toLowerCase() == suffix.toLowerCase()) { fullName = name; return; }});
				if (!fullName) { Object.keys(waifus).map(name=>{if (name.split(" ")[0].toLowerCase() == suffix.toLowerCase()) {fullName = name; return;}}); }
				if (!fullName) { Object.keys(waifus).map(name=>{if (name.split(" ").length > 1) {for (var i = 1;i < name.split(" ").length;i++) {if (name.split(" ")[i].toLowerCase() == suffix.toLowerCase()) {fullName = name; return;}}}}); }
			} else {
				if (msg.mentions.length > 0) { fullName = msg.mentions[0].username; if (msg.mentions[0].username == bot.user.username) { bot.sendMessage(msg, "I'd rate myself **10/10**"); return; }
				} else if (user) fullName = user.username;
			}
			if (fullName) {
				if (Ratings.hasOwnProperty(fullName.toLowerCase())) bot.sendMessage(msg, "I gave " + fullName + " a **" + Ratings[fullName.toLowerCase()] + "/10**"); //already rated
				else {
					if (user || msg.mentions.length > 0) bot.sendMessage(msg, "I'd rate " + fullName.replace(/@/g, '@\u200b') + " **" + generateUserRating(bot, msg, fullName) + "/10**");
					else bot.sendMessage(msg, "I'd rate " + fullName.replace(/@/g, '@\u200b') + " **" + generateJSONRating(fullName) + "/10**");
				}
			} else {
				if (Ratings.hasOwnProperty(suffix.toLowerCase())) bot.sendMessage(msg, "I gave " + suffix + " a **" + Ratings[suffix.toLowerCase()] + "/10**"); //already rated
				else bot.sendMessage(msg, "I give " + suffix.replace(/@/g, '@\u200b') + " a **" + generateRandomRating(suffix.toLowerCase(), true) + "/10**");
			}
			}
		}
	},
	"shared": {
		desc: "Get a list of servers that the bot sees a user in.",
		usage: "<user>",
		deleteCommand: true, cooldown: 7,
		process: function(bot, msg, suffix) {
			if (!msg.channel.isPrivate) {
				if (msg.mentions.length > 0) {
					var ss = "none";
					bot.servers.map(server => { if (server.members.indexOf(msg.mentions[0]) > -1) ss += ", " + server.name; });
					if (ss != "none") bot.sendMessage(msg, "**Shared Servers for " + msg.mentions[0].username.replace(/@/g, '@\u200b') + ":** `" + ss.substring(6).replace(/@/g, '@\u200b') + "`");
					else bot.sendMessage(msg, "Somehow I don't share any servers with that user", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else if (suffix) {
					var usr = findUser(msg.channel.server.members, suffix);
					if (usr) {
						var ss = "none";
						bot.servers.map((server) => { if (server.members.indexOf(usr) > -1) ss += ", " + server.name; });
						if (ss != "none") bot.sendMessage(msg, "**Shared Servers for " + usr.username.replace(/@/g, '@\u200b') + ":** `" + ss.substring(6).replace(/@/g, '@\u200b') + "`");
						else bot.sendMessage(msg, "Somehow I don't share any servers with that user", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					} else bot.sendMessage(msg, "User not found", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else correctUsage("shared", this.usage, msg, bot);
			} else bot.sendMessage(msg, "This command can't be used in a PM", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
		}
	},
	"image": {
		desc: "Get an image from Imgur",
		usage: "<subreddit> [--nsfw] [--day | --week | --month | --year | --all]",
		deleteCommand: false, cooldown: 10,
		info: "Avalible parameters are:\n\t`--nsfw` for getting NSFW images\n\t`--month` or other ranges for time ranges",
		process: function(bot, msg, suffix) {
			if (!IMGUR_CLIENT_ID || IMGUR_CLIENT_ID == "") { bot.sendMessage(msg, "⚠ No API key defined by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (/[\uD000-\uF8FF]/g.test(suffix)) { bot.sendMessage(msg, "Search cannot contain unicode characters.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (suffix && /^[^-].*/.test(suffix)) {
				var time = (/(--day|--week|--month|--year|--all)/i.test(suffix)) ? /(--day|--week|--month|--year|--all)/i.exec(suffix)[0] : '--week';
				var sendNSFW = (/ ?--nsfw/i.test(suffix)) ? true : false;
				if (!msg.channel.isPrivate && sendNSFW && !ServerSettings.hasOwnProperty(msg.channel.server.id)) { bot.sendMessage(msg, "This server doesn't have NSFW images allowed"); return; }
				if (!msg.channel.isPrivate && sendNSFW && !ServerSettings[msg.channel.server.id].allowNSFW) { bot.sendMessage(msg, "This server doesn't have NSFW images allowed"); return; }
				request({
						url: `https://api.imgur.com/3/gallery/r/${suffix.replace(/(--day|--week|--month|--year|--all|--nsfw|\/?r\/| )/gi, '')}/top/${time.substring(2)}/50`,
						headers: {'Authorization': 'Client-ID ' + IMGUR_CLIENT_ID}
				}, (error, response, body) => {
					if (error) { console.log(error); bot.sendMessage(msg, "Oh no! There was an error!"); }
					else if (response.statusCode != 200) bot.sendMessage(msg, "Got status code " + response.statusCode, (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					else if (body) {
						body = JSON.parse(body);
						if (body.hasOwnProperty("data") && body.data !== undefined && body.data.length !== 0) {
							for (var i = 0; i < 100; i++) {
								var toSend = body.data[Math.floor(Math.random() * (body.data.length))];
								if (!sendNSFW && toSend.nsfw != true) { if (toSend.title) bot.sendMessage(msg, `📷 ${toSend.link} ${toSend.title}`); else  + " " + bot.sendMessage(msg, toSend.link); break; }
								else if (sendNSFW && toSend.nsfw == true) { if (toSend.title) bot.sendMessage(msg, `📷 ${toSend.link} **(NSFW)** ${toSend.title}`); else  + " " + bot.sendMessage(msg, toSend.link + " **(NSFW)**"); break; }
							}
						} else bot.sendMessage(msg, "Nothing found!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					}
				});
			} else correctUsage("image", this.usage, msg, bot);
		}
	},
	"fortune": {
		desc: "Get a fortune",
		usage: "[category]",
		info: "Get a fortune from `yerkee.com/api`.\nThe avalible categories are: all, computers, cookie, definitions, miscellaneous, people, platitudes, politics, science, and wisdom.",
		deleteCommand: false,
		cooldown: 10,
		process: function(bot, msg, suffix) {
			var cat = 'wisdom';
			if (suffix && /^(all|computers|cookie|definitions|miscellaneous|people|platitudes|politics|science|wisdom)$/i.test(suffix.trim())) cat = suffix.trim();
			request.get('http://www.yerkee.com/api/fortune/' + cat, (e, r, b)=>{
				if (e) bot.sendMessage(msg, 'Got an error: ' + e);
				else if (r.statusCode !== 200) bot.sendMessage(msg, 'Got status code '+ r.statusCode);
				else {
					b = JSON.parse(b);
					if (b.hasOwnProperty('fortune') && b.fortune !== undefined) bot.sendMessage(msg, "🔮 " + msg.author.username.replace(/@/g, '@\u200b') + ',\n' + b.fortune);
					else bot.sendMessage(msg, 'No data was returned from the API');
				}
			})
		}
	},
	"remindme": {
		desc: "Set reminders.",
		usage: "<reminder> in <[0 days] [00 hours] [00 minutes] [000 seconds]> | remove <text in reminder> | list ",
		info: "__remove:__ Will remove a reminder containing the text input.\n__list:__ List your reminders.\n__add:__ Use the *<text> in <[0 days] [00 hours] [00 minutes] [000 seconds]>*  format.",
		deleteCommand: false, cooldown: 5,
		process: function(bot, msg, suffix) {
			if (/^remove/i.test(suffix)) {

				if (suffix.length > 7) {
					remind.removeReminder(suffix.replace(/^remove /i, ''), msg.author.id, ()=>{
						bot.sendMessage(msg, "Successfully removed reminder 👍");
					}, ()=>{
						bot.sendMessage(msg, "No matching reminder found 👎");
					});
				} else {
					var list = remind.listForUser(msg.author.id);
					if (list && list.length > 0) bot.sendMessage(msg, "__Use `" + config.command_prefix + "remindme remove ` + the text from the reminder you wish to remove:__\n"+list.join('\n'));
					else bot.sendMessage(msg, "Looks like you don't have any reminders!");
				}

			} else if (suffix.toLowerCase() === 'list') {

				var list = remind.listForUser(msg.author.id);
				if (list && list.length > 0) bot.sendMessage(msg, "__Here are your reminders:__\n"+list.join('\n'));
				else bot.sendMessage(msg, "Looks like you don't have any reminders!");

			} else if (/^.* in( ((\d\d?\d?|a|one|two|three) ?d[ays]*)( and| &)?)?( ((\d\d?\d?|a|an|one|two|three) ?h[ours]*)( and| &)?)?( ((\d\d?\d?|a|one|two|three) ?m[inutes]*)( and| &)?)?( (\d\d?\d?|a|one|two|three) ?s[econds]*)?$/i.test(suffix)) {

				if (remind.countForUser(msg.author.id) >= 5) {
					bot.sendMessage(msg, "You can't add any more reminders because you already have 5. You can remove a reminder to make space with `" + config.command_prefix + "remindme remove <text>`");
					return;
				}

				var millisecs = 0
					,timeString = suffix.replace(/.* in /i, '');
				if (/ ((\d\d?\d?\d?\d?|a|one|two|three) ?s[econds]*)$/i.test(suffix)) {
					millisecs += timeParser(/((\d\d?\d?\d?\d?|a|one|two|three) ?s[econds]*)$/i.exec(suffix)[2] + "", 1000);
					suffix = suffix.replace(/( and| &)? ((\d\d?\d?\d?\d?|a|one|two|three) ?s[econds]*)$/i, '');
				}
				if (/ ((\d\d?\d?|a|one|two|three) ?m[inutes]*)$/i.test(suffix)) {
					millisecs += timeParser(/((\d\d?\d?|a|one|two|three) ?m[inutes]*)$/i.exec(suffix)[2] + "", 60000);
					suffix = suffix.replace(/( and| &)? ((\d\d?\d?|a|one|two|three) ?m[inutes]*)$/i, '');
				}
				if (/ ((\d\d?\d?|a|an|one|two|three) ?h[ours]*)$/i.test(suffix)) {
					millisecs += timeParser(/((\d\d?\d?|a|an|one|two|three) ?h[ours]*)$/i.exec(suffix)[2] + "", 3600000);
					suffix = suffix.replace(/( and| &)? ((\d\d?\d?|a|an|one|two|three) ?h[ours]*)$/i, '');
				}
				if (/ ((\d\d?\d?|a|one|two|three) ?d[ays]*)$/i.test(suffix)) {
					var hours = /((\d\d?\d?|a|one|two|three) ?d[ays]*)$/i.exec(suffix)[2];
					if (/\d\d\d?/.test(hours)) {
						if (hours > 14) { bot.sendMessage(msg, "There is a 14 day limit on reminders", (e, m)=>{bot.deleteMessage(m,{"wait": 10000});}); return; }
					}
					millisecs += timeParser(hours + "", 86400000);
					suffix = suffix.replace(/( and| &)? ((\d|a|one|two|three) ?d[ays]*)$/i, '');
				}
				if (millisecs > 1209600000) { bot.sendMessage(msg, "There is a 14 day limit on reminders", (e, m)=>{bot.deleteMessage(m,{"wait": 10000});}); return; }
				else if (millisecs <= 0) { bot.sendMessage(msg, "You must specify a time in the future", (e, m)=>{bot.deleteMessage(m,{"wait": 10000});}); return; }

				var reminder = suffix.replace(/^(me )?(to )?/i, '').replace(/in ?$/i, '').trim();
				remind.addReminder(msg.author.id, Date.now() + millisecs, reminder);
				bot.sendMessage(msg, "⏰ Got it! I'll remind you in " + timeString);

			} else correctUsage("remindme", this.usage, msg, bot, 15000);
		}
	},
	"rip": {
		desc: "Rest in peace", usage: "[text]",
		deleteCommand: true, cooldown: 3,
		process: function(bot, msg, suffix) {
			if (suffix) bot.sendMessage(msg, `💀 <https://ripme.xyz/${ent.encodeHTML(suffix).replace(/ /g, "%20")}>`);
			else bot.sendMessage(msg, "💀 <https://ripme.xyz>");
		}
	},
	"inrole": {
		desc: "Get a list of the users in a role", usage: "<role name>",
		deleteCommand: true, cooldown: 3,
		process: function(bot, msg, suffix) {
			if (msg.everyoneMentioned || suffix == "everyone") bot.sendMessage(msg, "Yeah right, like I'd let you do that", (e, m)=>{bot.deleteMessage(m,{"wait": 6000});});
			else if (suffix) {
				var role = msg.channel.server.roles.find(r=>suffix.toLowerCase() == r.name.toLowerCase());
				if (!role) bot.sendMessage(msg, "Role not found", (e, m)=>{bot.deleteMessage(m,{"wait": 6000});});
				else {
					var withRole = msg.channel.server.usersWithRole(role);
					if (withRole.length > 0) bot.sendMessage(msg, "Users in role \"" + suffix.replace(/@/g, '@\u200b') + "\":" + withRole.map(u=>" "+u.username.replace(/@/g, '@\u200b')));
					else bot.sendMessage(msg, "No users in that role!", (e, m)=>{bot.deleteMessage(m,{"wait": 6000});});
				}
			} else bot.sendMessage(msg, "Please specify a role", (e, m)=>{bot.deleteMessage(m,{"wait": 6000});});
		}
	}
};

exports.commands = commands;
exports.aliases = aliases;
