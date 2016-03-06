var config = require("./config.json");
var games = require("./games.json").games;
var version = require("../package.json").version;
var colors = require("./styles.js");
var request = require("request");
var xml2js = require("xml2js");
var osuapi = require("osu-api");
var ent = require("entities");
var waifus = require("./waifus.json");
var db = require("./db.js");

var VoteDB = {}
	,LottoDB = {}
	,Ratings = {};
const IMGUR_CLIENT_ID = config.imgur_client_id;
const OSU_API_KEY = config.osu_api_key;
const OWM_API_KEY = config.weather_api_key;
const MAL_USER = config.mal_user;
const MAL_PASS = config.mal_pass;

/*****************************\
		   Functions
\*****************************/

function correctUsage(cmd) {
	return (commands.hasOwnProperty(cmd)) ? "Usage: `" + config.command_prefix + "" + cmd + " " + commands[cmd].usage + "`": "This should display the correct usage but the bot maker made a mistake";
}

function autoEndVote(bot, msg) {
	setTimeout(() => {
		if (VoteDB.hasOwnProperty(msg.channel.id)) { commands["vote"].process(bot, msg, "end"); }
	}, 600000); //10 minutes = 600,000
}

function autoEndLotto(bot, msg) {
	setTimeout(() => {
		if (LottoDB.hasOwnProperty(msg.channel.id)) { commands["lotto"].process(bot, msg, "end"); }
	}, 600000);
}

function findUser(members, query) {
	var usr = members.find((member) => { return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase() == query.toLowerCase() });
	if (!usr) { usr = members.find((member) => { return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase().indexOf(query.toLowerCase()) == 0 }); }
	if (!usr) { usr = members.find((member) => { return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase().indexOf(query.toLowerCase()) > -1 }); }
	return usr || false;
}

function generateRandomRating(fullName, storeRating) {
	var weightedNumber = Math.floor((Math.random() * 20) + 1); //between 1 and 20
	var score, moreRandom = Math.floor(Math.random() * 4);
	if (weightedNumber < 5) { score = Math.floor((Math.random() * 3) + 1); } //between 1 and 3
	else if (weightedNumber > 4 && weightedNumber < 16) { score = Math.floor((Math.random() * 4) + 4); } //between 4 and 7
	else if (weightedNumber > 15) { score = Math.floor((Math.random() * 3) + 8); } //between 8 and 10
	if (moreRandom === 0 && score !== 1) { score -= 1;
	} else if (moreRandom == 3 && score != 10) { score += 1; }
	if (storeRating) { Ratings[fullName.toLowerCase()] = score; }
	return score;
}

function generateUserRating(bot, msg, fullName) {
	var user = msg.channel.server.members.get("username", fullName);
	if (user === undefined) { return generateRandomRating(); }
	var score = generateRandomRating() - 1;
	try {
		var joined = new Date(msg.channel.server.detailsOfUser(user).joinedAt), now = new Date();
		if (now.valueOf() - joined.valueOf() >= 2592000000) { score += 1; } //if user has been on the server for at least one month +1
	} catch (e) { console.log(colors.cError(" ERROR ") + e.stack); }
	if (msg.channel.permissionsOf(user).hasPermission("manageServer")) { score += 1; } //admins get +1 ;)
	var count = 0;
	bot.servers.map((server) => { if (server.members.get("id", user.id)) { count += 1; } }); //how many servers does the bot share with them
	if (count > 2) { score += 1; } //if we share at least 3 servers
	if (!user.avatarURL) { score -= 1; } //gotta have an avatar
	if (user.username.length > 22) { score -= 1; } //long usernames are hard to type so -1
	if (score > 10) { score = 10; } else if (score < 1) { score = 1; } //keep it within 1-10
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
		"9": "10-10",
	};
	var score = Math.floor((Math.random() * ((parseInt(ranges[ranking].split("-")[1], 10) + 1 - parseInt(ranges[ranking].split("-")[0], 10)))) + parseInt(ranges[ranking].split("-")[0], 10))
	var moreRandom = Math.floor(Math.random() * 4); //0-3
	if (score > 1 && moreRandom === 0) { score -= 1; } else if (score < 10 && moreRandom == 3) { score += 1; }
	Ratings[fullName.toLowerCase()] = score;
	return score;
}

/*****************************\
Commands (Check https://github.com/brussell98/BrussellBot/wiki/New-Command-Guide for how to make new ones)
\*****************************/

var aliases = {
	"h": "help", "commands": "help",
	"server": "botserver",
	"backwards": "reverse",
	"myid": "id",
	"p": "ping",
	"j": "join", "joins": "join",
	"i": "info",
	"a": "avatar",
	"pick": "choose", "c": "choose",
	"v": "vote",
	"coin": "coinflip", "flip": "coinflip",
	"poll": "strawpoll", "straw": "strawpoll",
	"8": "8ball", "ball": "8ball",
	"w": "weather",
	"g": "google", "lmgtfy": "google",
	"number": "numberfacts", "num": "numberfacts",
	"cat": "catfacts", "meow": "catfacts", "neko": "catfacts",
	"r": "ratewaifu", "rate": "ratewaifu", "waifu": "ratewaifu",
	"imgur": "image", "im": "image"
};

var commands = {
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]",
		deleteCommand: true, shouldDisplay: false, cooldown: 1,
		process: function(bot, msg, suffix) {
			var toSend = [];
			if (!suffix) {
				toSend.push("Use `" + config.command_prefix + "help <command name>` to get info on a specific command.");
				toSend.push("Mod commands can be found with `" + config.mod_command_prefix + "help [command]`.");
				toSend.push("You can also find examples and more at **http://brussell98.github.io/bot/commands.html**");
				toSend.push("**Commands:**\n");
				toSend.push("`@" + bot.user.username + " text`\n		Talk to the bot (cleverbot)");
				Object.keys(commands).forEach(function(cmd) {
					if (commands[cmd].hasOwnProperty("shouldDisplay")) {
						if (commands[cmd].shouldDisplay) { toSend.push("`" + config.command_prefix + cmd + " " + commands[cmd].usage + "`\n		" + commands[cmd].desc); }
					} else { toSend.push("`" + config.command_prefix + cmd + " " + commands[cmd].usage + "`\n		" + commands[cmd].desc); }
				});
				var helpMessage = toSend.join("\n");
				var helpPart2 = helpMessage.substring(helpMessage.indexOf("`]lotto`"));
				var helpPart1 = helpMessage.substring(0, helpMessage.indexOf("`]lotto`") - 1);
				bot.sendMessage(msg.author, helpPart1);
				bot.sendMessage(msg.author, helpPart2);
			} else {
				suffix = suffix.trim().toLowerCase();
				if (commands.hasOwnProperty(suffix)) {
					toSend.push("**" + config.command_prefix + "" + suffix + ":** " + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { toSend.push("**Usage:** `" + config.command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { toSend.push("**Cooldown:** " + commands[suffix].cooldown + " seconds"); }
					if (commands[suffix].hasOwnProperty("deleteCommand")) { toSend.push("*Delete Command: true*"); }
					bot.sendMessage(msg, toSend);
				} else { bot.sendMessage(msg, "Command `" + suffix + "` not found.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			}
		}
	},
	"botserver": {
		desc: "Get a link to the BrussellBot / Bot-chan server.",
		cooldown: 10, usage: "",
		process: function(bot, msg, suffix) {
			bot.sendMessage(msg, "Here's an invite to my server: **discord.gg/0kvLlwb7slG3XCCQ**");
		}
	},
	"reverse": {
		desc: "Returns the input backwards",
		usage: "<text>", deleteCommand: true, cooldown: 5, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (suffix) { bot.sendMessage(msg, "\u202e " + suffix); }
		}
	},
	"id": {
		desc: "Returns your ID (or the channel's)",
		usage: "[\"channel\"]", deleteCommand: true, cooldown: 2, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (suffix && suffix.trim().replace("\"", "") === "channel") { bot.sendMessage(msg, "This channel's ID is: " + msg.channel.id);
			} else { bot.sendMessage(msg, "Your ID is: " + msg.author.id); }
		}
	},
	"beep": {
		desc: "boop", usage: "", deleteCommand: false, cooldown: 2,
		process: (bot, msg, suffix) => { bot.sendMessage(msg, "boop    |    Time taken: " + (new Date() - msg.timestamp) + "ms"); }
	},
	"ping": {
		desc: "Replies with pong.",
		cooldown: 2, shouldDisplay: false, usage: "",
		process: function(bot, msg) {
			var timeTaken = new Date();
			var n = Math.floor(Math.random() * 6);
			if (n === 0) { bot.sendMessage(msg, "pong    |    Time taken: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 1) { bot.sendMessage(msg, "You thought I'd say pong, *didn't you?*    |    Time taken: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 2) { bot.sendMessage(msg, "pong!    |    Time taken: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 3) { bot.sendMessage(msg, "Yeah, I'm still here    |    Time taken: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 4) { bot.sendMessage(msg, "...    |    Time taken: " + (timeTaken - msg.timestamp) + "ms");
			} else if (n === 5) { bot.sendMessage(msg, config.command_prefix + "ping    |    Time taken: " + (timeTaken - msg.timestamp) + "ms"); }
		}
	},
	"join": {
		desc: "Accepts an invite.",
		usage: "<invite link(s)> [-a (announce presence)]",
		deleteCommand: true,
		process: function(bot, msg, suffix) {
			if (suffix) {
				var invites = suffix.split(" ");
				invites.map(function(invite) {
					if (/https?:\/\/discord\.gg\/[A-Za-z0-9]+/.test(invite)) {
						var cServers = [];
						bot.servers.map(function(srvr) { cServers.push(srvr.id); });
						bot.joinServer(invite, function(err, server) {
							if (err) {
								bot.sendMessage(msg, "⚠ Failed to join: " + err);
								console.log(colors.cWarn(" WARN ") + err);
							} else if (cServers.indexOf(server.id) > -1) {
								console.log("Already in server");
								bot.sendMessage(msg, "I'm already in that server!");
							} else {
								if (config.banned_server_ids && config.banned_server_ids.indexOf(server.id) > -1) {
									console.log(colors.cRed("Joined server but it was on the ban list") + ": " + server.name);
									bot.sendMessage(msg, "This server is on the ban list");
									bot.leaveServer(server);
									return;
								}
								console.log(colors.cGreen("Joined server: ") + server.name);
								bot.sendMessage(msg, "✅ Successfully joined ***" + server.name + "***");
								db.addServer(server);
								if (suffix.indexOf("-a") != -1) {
									var toSend = [];
									toSend.push("Hi! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author + ".");
									toSend.push("Use `" + config.command_prefix + "help` to get a list of normal commands.");
									toSend.push("Mod/Admin commands __including bot settings__ can be viewed with `" + config.mod_command_prefix + "`help ");
									toSend.push("For help / feedback / bugs / testing / announcements / changelogs / etc. go to **discord.gg/0kvLlwb7slG3XCCQ**");
									bot.sendMessage(server.defaultChannel, toSend);
								} else { setTimeout(function() { bot.sendMessage(server.defaultChannel, "*Joined on request of " + msg.author + "*"); }, 2000); }
							}
						});
					}
				});
			} else { bot.sendMessage(msg, correctUsage("join")); }
		}
	},
	"about": {
		desc: "About me",
		deleteCommand: true, cooldown: 10, usage: "",
		process: function(bot, msg, suffix) {
			bot.sendMessage(msg, "I'm " + bot.user.username + " and ~~I was made by brussell98.~~ I'm a strong independent bot who don't need no creator.\nI run on `discord.js` and my website is **brussell98.github.io/bot/main.html**");
		}
	},
	"dice": {
		desc: "Roll dice. (1d6 by default)",
		deleteCommand: true,
		usage: "[(rolls)d(sides)]",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			var dice = "1d6";
			if (suffix && /\d+d\d+/.test(suffix) && suffix.indexOf(".") == -1) { dice = suffix; }
			request("https://rolz.org/api/?" + dice + ".json", function(err, response, body) {
				if (!err && response.statusCode == 200) {
					var roll = JSON.parse(body);
					if (roll.details == null) { bot.sendMessage(msg, roll.result, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (roll.details.length <= 100) { bot.sendMessage(msg, "🎲 Your **" + roll.input + "** resulted in " + roll.result + " " + roll.details);
					} else { bot.sendMessage(msg, "🎲 Your **" + roll.input + "** resulted in " + roll.result); }
				} else { console.log(colors.cWarn(" WARN ") + "Got an error: " + err + ", status code: ", response.statusCode); }
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
			} catch (err) { console.log(colors.cError(" ERROR ") + err); bot.sendMessage(msg, "⚠ Error parsing suffix into int", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			bot.sendMessage(msg, msg.author.username + " rolled **1-" + roll + "** and got " + Math.floor((Math.random() * (roll)) + 1));
		}
	},
	"info": {
		desc: "Gets info on the server or a user if mentioned.",
		usage: "[username]",
		deleteCommand: true,
		cooldown: 10,
		process: function(bot, msg, suffix) {
			if (!msg.channel.isPrivate) {
				if (suffix) {
					if (msg.mentions.length > 0) {
						if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						if (msg.mentions.length > 4) { bot.sendMessage(msg, "Limit of 4 users", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						msg.mentions.map(function(usr) {
							var toSend = [], count = 0;
							toSend.push("ℹ **Info on** " + usr.username + " (" + usr.discriminator + ")");
							toSend.push("**ID:** " + usr.id);
							if (usr.game && usr.game.name !== undefined && usr.game.name !== null && usr.game.name !== "null") toSend.push("**Status:** " + usr.status + " **last playing** " + usr.game.name);
							else toSend.push("**Status:** " + usr.status);
							var detailsOf = msg.channel.server.detailsOfUser(usr);
							if (detailsOf) toSend.push("**Joined on:** " + new Date(msg.channel.server.detailsOfUser(usr).joinedAt).toUTCString());
							else toSend.push("**Joined on:** Error");
							var roles = msg.channel.server.rolesOfUser(usr.id).map((role) => { return role.name; });
							if (roles) {
								roles = roles.join(", ").replace("@", "");
								if (roles && roles !== "")
									if (roles.length <= 1500) { toSend.push("**Roles:** `" + roles + "`"); } else { toSend.push("**Roles:** `" + roles.split(", ").length + "`"); }
								else
									toSend.push("**Roles:** `none`");
							} else toSend.push("**Roles:** Error");
							bot.servers.map((server) => { if (server.members.indexOf(usr) > -1) { count += 1; } });
							if (count > 1) { toSend.push("**Shared servers:** " + count); }
							if (usr.avatarURL != null) { toSend.push("**Avatar URL:** `" + usr.avatarURL + "`"); }
							bot.sendMessage(msg, toSend);
						});
					} else {
						if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						var users = suffix.split(/, ?/);
						if (users.length > 4) { bot.sendMessage(msg, "Limit of 4 users", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						users.map(function(user) {
							var usr = findUser(msg.channel.server.members, user);
							if (usr) {
								var toSend = [], count = 0;
								toSend.push("ℹ **Info on** " + usr.username + " (" + usr.discriminator + ")");
								toSend.push("**ID:** " + usr.id);
								if (usr.game && usr.game.name !== undefined && usr.game.name !== null && usr.game.name !== "null") toSend.push("**Status:** " + usr.status + " **last playing** " + usr.game.name);
								else toSend.push("**Status:** " + usr.status);
								var detailsOf = msg.channel.server.detailsOfUser(usr);
								if (detailsOf) toSend.push("**Joined on:** " + new Date(msg.channel.server.detailsOfUser(usr).joinedAt).toUTCString());
								else toSend.push("**Joined on:** Error");
								var roles = msg.channel.server.rolesOfUser(usr.id).map((role) => { return role.name; });
								if (roles) {
									roles = roles.join(", ").replace("@", "");
									if (roles && roles !== "")
										if (roles.length <= 1500) { toSend.push("**Roles:** `" + roles + "`"); } else { toSend.push("**Roles:** `" + roles.split(", ").length + "`"); }
									else
										toSend.push("**Roles:** `none`");
								} else toSend.push("**Roles:** Error");
								bot.servers.map((server) => { if (server.members.indexOf(usr) > -1) { count += 1; } });
								if (count > 1) { toSend.push("**Shared servers:** " + count); }
								if (usr.avatarURL != null) { toSend.push("**Avatar URL:** `" + usr.avatarURL + "`"); }
								bot.sendMessage(msg, toSend);
							} else bot.sendMessage(msg, "User \"" + user + "\" not found. If you want to get info on multiple users separate them with a comma.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); });
						});
					}
				} else {
					var toSend = [];
					toSend.push("ℹ **Info on** " + msg.channel.server.name);
					toSend.push("**Server ID:** " + msg.channel.server.id);
					toSend.push("**Owner:** " + msg.channel.server.owner.username + " (**ID:** " + msg.channel.server.owner.id + ")");
					toSend.push("**Region:** " + msg.channel.server.region);
					toSend.push("**Members:** " + msg.channel.server.members.length + " **Channels:** " + msg.channel.server.channels.length);
					var roles = msg.channel.server.roles.map((role) => { return role.name; });
					roles = roles.join(", ").replace("@", "");
					if (roles.length <= 1500) toSend.push("**Roles:** `" + roles + "`");
					else toSend.push("**Roles:** `" + roles.split(", ").length + "`");
					toSend.push("**Default channel:** " + msg.channel.server.defaultChannel);
					toSend.push("**This channel's id:** " + msg.channel.id);
					toSend.push("**Icon URL:** `" + msg.channel.server.iconURL + "`");
					bot.sendMessage(msg, toSend);
				}
			} else bot.sendMessage(msg, "⚠ Can't do that in a DM.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
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
			if (msg.mentions.length == 0 && !suffix) { (msg.author.avatarURL != null) ? bot.sendMessage(msg, msg.author.username + "'s avatar is: " + msg.author.avatarURL) : bot.sendMessage(msg, msg.author.username + " has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else if (msg.mentions.length > 0) {
				if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (msg.mentions.length > 6) { bot.sendMessage(msg, "Limit of 6 users", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				msg.mentions.map(function(usr) {
					(usr.avatarURL != null) ? bot.sendMessage(msg, "**" + usr.username + "**'s avatar is: " + usr.avatarURL + "") : bot.sendMessage(msg, "**" + usr.username + "** has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
				});
			} else {
				if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var users = suffix.split(/, ?/);
				if (users.length > 6) { bot.sendMessage(msg, "Limit of 6 users", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				users.map(function(user) {
					var usr = findUser(msg.channel.server.members, user);
					if (usr) { (usr.avatarURL != null) ? bot.sendMessage(msg, "**" + usr.username + "**'s avatar is: " + usr.avatarURL + "") : bot.sendMessage(msg, "**" + usr.username + "** has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
					} else { bot.sendMessage(msg, "User \"" + user + "\" not found. (Blame *Better*Discord) If you want to get the avatar of multiple users separate them with a comma.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 20000}); }); }
				});
			}
		}
	},
	"choose": {
		desc: "Makes a choice for you.",
		usage: "<option 1>, <option 2>, [option], [option]",
		cooldown: 4,
		deleteCommand: false,
		process: function(bot, msg, suffix) {
			if (!suffix || /(.*), ?(.*)/.test(suffix) == false) { bot.sendMessage(msg, correctUsage("choose"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			var choices = suffix.split(/, ?/);
			if (choices.length < 2) {
				bot.sendMessage(msg, correctUsage("choose"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else {
				if (choices.indexOf('homework') > -1 || choices.indexOf('hw') > -1) {
					var choice = (choices.indexOf('homework') > -1) ? choices.indexOf('homework') : choices.indexOf('hw');
					bot.sendMessage(msg, "I chose **" + choices[choice] + "**");
				} else {
					var choice = Math.floor(Math.random() * (choices.length));
					bot.sendMessage(msg, "I chose **" + choices[choice] + "**");
				}
			}
		}
	},
	"lotto": {
		desc: "Lottery picks a random entered user.",
		usage: "end | enter | new [max entries] | <mentions to pick from> (pick from the users mentioned) | everyone",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			var currentchannel = msg.channel.id;
			if (msg.everyoneMentioned || suffix.toLowerCase() == "everyone") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
				if (LottoDB.hasOwnProperty(msg.channel.id)) { bot.sendMessage(msg, "There is already a lottery running!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.sendMessage(msg, "Out of " + msg.channel.server.members.length + " members on this server, " + msg.channel.server.members.random().username + " is the winner!");

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
							bot.sendMessage(msg, "Out of **" + (LottoDB[currentchannel][0].entries.split(",").length - 1) + "** entries the winner is " + winner);
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
				bot.sendMessage(msg, "Out of **" + msg.mentions.length + "** entries the winner is " + msg.mentions[choice]);

			} else { bot.sendMessage(msg, correctUsage("lotto"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); } //wrong usage
		}
	},
	"vote": {
		desc: "Start / end a vote, or vote on one.",
		usage: "+/- | new <topic> [-noautoend] | end",
		deleteCommand: true,
		process: function(bot, msg, suffix) {
			var currentChannel = msg.channel.id;
			if (suffix.split(" ")[0] == "new") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
				if (VoteDB.hasOwnProperty(currentChannel)) { bot.sendMessage(msg, "There is already a vote pending!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var topic = (suffix.replace(" -noautoend", "").split(" ").length > 1) ? suffix.replace(" -noautoend", "").substring(4) : "None";
				bot.sendMessage(msg, "New vote started by **" + msg.author.username + "**. Topic: `" + topic + "`. To vote say `" + config.command_prefix + "vote +/-`\nUpvotes: 0\nDownvotes: 0", function(err, message) {
					if (err) { bot.sendMessage(msg, err); return; }
					var object = {"topic": topic, "annMsg": message, "upvoters": "", "downvoters": "", "upvotes": 0, "downvotes": 0, "starter": msg.author.id};
					VoteDB[currentChannel] = [];
					VoteDB[currentChannel][0] = object;
					if (suffix.indexOf("-noautoend") == -1) { autoEndVote(bot, msg); }
				});

			} else if (suffix.replace(" ", "") == "end") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
				if (!VoteDB.hasOwnProperty(currentChannel)) { bot.sendMessage(msg, "There isn't a vote to end!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (msg.author.id == VoteDB[currentChannel][0].starter || msg.channel.permissionsOf(msg.author).hasPermission("manageChannel")) {
					bot.deleteMessage(VoteDB[currentChannel][0].annMsg);
					bot.sendMessage(msg, "**Results of last vote:**\nTopic: `" + VoteDB[currentChannel][0].topic + "`\nUpvotes: `" + VoteDB[currentChannel][0].upvotes + " " + Math.round((VoteDB[currentChannel][0].upvotes / (VoteDB[currentChannel][0].upvotes + VoteDB[currentChannel][0].downvotes)) * 100) + "%`\nDownvotes: `" + VoteDB[currentChannel][0].downvotes + " " + Math.round((VoteDB[currentChannel][0].downvotes / (VoteDB[currentChannel][0].upvotes + VoteDB[currentChannel][0].downvotes)) * 100) + "%`");
					delete VoteDB[currentChannel];
				} else { bot.sendMessage(msg, "Only the person that started the vote can end it!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }

			} else if (suffix.replace(" ", "") == "+" || suffix.replace(" ", "") == "-") {

				if (msg.channel.isPrivate) { bot.sendMessage(msg, "Can't do that in a direct message"); return; }
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
			} else { bot.sendMessage(msg, correctUsage("vote"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 12000}); }); }
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
				request.post(
					{
						"url": "https://strawpoll.me/api/v2/polls",
						"headers": {"content-type": "application/json"},
						"json": true,
						body: {
							"title": "" + msg.author.username + "'s Poll",
							"options": suffix
						}
					},
					function(error, response, body) {
						if (!error && response.statusCode == 201) {
							bot.sendMessage(msg, msg.author.username + " created a strawpoll. Vote here: http://strawpoll.me/" + body.id);
						} else if (error) { bot.sendMessage(msg, error);
						} else if (response.statusCode != 201) { bot.sendMessage(msg, "Got status code " + response.statusCode); }
					}
				);
			} else { bot.sendMessage(msg, correctUsage("strawpoll"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"8ball": {
		desc: "It's an 8ball...",
		usage: "[question]",
		cooldown: 4,
		process: function(bot, msg) {
			var responses = ["It is certain", "Without a doubt", "You may rely on it", "Most likely", "Yes", "Signs point to yes", "Better not tell you now", "Don't count on it", "My reply is no", "My sources say no", "Outlook not so good", "Very doubtful"];
			var choice = Math.floor(Math.random() * (responses.length));
			bot.sendMessage(msg, "🎱 " + responses[choice]);
		}
	},
	"anime": {
		desc: "Gets details on an anime from MAL.",
		usage: "<anime name>",
		deleteCommand: true,
		cooldown: 6,
		process: function(bot, msg, suffix) {
			if (suffix) {
				if (!MAL_USER || !MAL_PASS || MAL_USER == "" || MAL_PASS =="") { bot.sendMessage(msg, "MAL login not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (/[\uD000-\uF8FF]/g.test(suffix)) { bot.sendMessage(msg, "Search cannot contain unicode characters.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/anime/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": MAL_USER, "pass": MAL_PASS, "sendImmediately": false}}, function(error, response, body) {
					if (error) { console.log(error); }
					if (!error && response.statusCode == 200) {
						xml2js.parseString(body, function(err, result) {
							var title = result.anime.entry[0].title;
							var english = result.anime.entry[0].english;
							var ep = result.anime.entry[0].episodes;
							var score = result.anime.entry[0].score;
							var type = result.anime.entry[0].type;
							var status = result.anime.entry[0].status;
							var synopsis = result.anime.entry[0].synopsis.toString();
							var id = result.anime.entry[0].id;
							synopsis = synopsis.replace(/<br \/>/g, " "); synopsis = synopsis.replace(/\[(.{1,10})\]/g, "");
							synopsis = synopsis.replace(/\r?\n|\r/g, " "); synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*"); synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = ent.decodeHTML(synopsis);
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); synopsis += "..."; }
							}
							bot.sendMessage(msg, "**" + title + " / " + english + "**\n**Type:** " + type + " **| Episodes:** " + ep + " **| Status:** " + status + " **| Score:** " + score + "\n" + synopsis + "\n**www.myanimelist.net/anime/" + id + "**");
						});
					} else { bot.sendMessage(msg, "\"" + suffix + "\" not found. Blame the MAL search API", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				});
				bot.stopTyping(msg.channel);
			} else { bot.sendMessage(msg, correctUsage("anime"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"manga": {
		desc: "Gets details on a manga from MAL.",
		usage: "<manga/novel name>",
		deleteCommand: true,
		cooldown: 6,
		process: function(bot, msg, suffix) {
			if (suffix) {
				if (!MAL_USER || !MAL_PASS || MAL_USER == "" || MAL_PASS =="") { bot.sendMessage(msg, "MAL login not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (/[\uD000-\uF8FF]/g.test(suffix)) { bot.sendMessage(msg, "Search cannot contain unicode characters.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/manga/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": MAL_USER, "pass": MAL_PASS, "sendImmediately": false}}, function(error, response, body) {
					if (error) { console.log(error); }
					if (!error && response.statusCode == 200) {
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
							synopsis = synopsis.replace(/<br \/>/g, " "); synopsis = synopsis.replace(/\[(.{1,10})\]/g, "");
							synopsis = synopsis.replace(/\r?\n|\r/g, " "); synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*"); synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = ent.decodeHTML(synopsis);
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); }
							}
							bot.sendMessage(msg, "**" + title + " / " + english + "**\n**Type:** " + type + " **| Chapters:** " + chapters + " **| Volumes: **" + volumes + " **| Status:** " + status + " **| Score:** " + score + "\n" + synopsis + "\n**www.myanimelist.net/manga/" + id + "**");
						});
					} else { bot.sendMessage(msg, "\"" + suffix + "\" not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				});
				bot.stopTyping(msg.channel);
			} else { bot.sendMessage(msg, correctUsage("manga"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"coinflip": {
		desc: "Flip a coin",
		usage: "",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			var side = Math.floor(Math.random() * (2));
			if (side == 0) { bot.sendMessage(msg, "**" + msg.author.username + "** flipped a coin and got **Heads**");
			} else { bot.sendMessage(msg, "**" + msg.author.username + "** flipped a coin and got **Tails**"); }
		}
	},
	"osu": {
		desc: "Osu! commands. Use " + config.command_prefix + "help osu",
		usage: "sig [username] [hex] | best [username] | user [username] | recent [username]",
		deleteCommand: true,
		cooldown: 5,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, correctUsage("osu"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); return; }
			if (suffix.split(" ")[0] === "sig") {

				var color = "ff66aa",
					username = msg.author.username;
				suffix = suffix.trim().split(" ");
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
				request({url: "https://lemmmy.pw/osusig/sig.php?colour=hex" + color + "&uname=" + username + "&pp=2&flagshadow&xpbar&xpbarhex&darktriangles", encoding: null}, function(err, response, body) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (response.statusCode != 200) { bot.sendMessage(msg, "⚠ Got status code " + response.statusCode, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					bot.sendMessage(msg, "Here's your osu signature for **" + username + "**! Get a live version at `lemmmy.pw/osusig/`");
					bot.sendFile(msg, body, "sig.png");
				});

			} else if (suffix.split(" ")[0] == "user") {

				var username = (suffix.split(" ").length < 2) ?  msg.author.username : suffix.substring(5);
				if (!OSU_API_KEY || OSU_API_KEY == "") { bot.sendMessage(msg, "Osu API key not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(OSU_API_KEY);
				osu.getUser(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data) { bot.sendMessage(msg, "⚠ User \"" + username + "\" not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var toSend = [];
					if (data.playcount === null) { bot.sendMessage(msg, "User has no data", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
					toSend.push("Osu stats for: **" + data.username + "**:");
					toSend.push("━━━━━━━━━━━━━━━━━━━");
					toSend.push("**Play Count**: " + data.playcount.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Ranked Score**: " + data.ranked_score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Total Score**: " + data.total_score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Level**: " + data.level.substring(0, data.level.split(".")[0].length + 3));
					toSend.push("**PP**: " + data.pp_raw.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Rank**: #" + data.pp_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Country Rank**: #" + data.pp_country_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Accuracy**: " + data.accuracy.substring(0, data.accuracy.split(".")[0].length + 3) + "%");
					toSend.push("**300**: " + data.count300.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **100**: " + data.count100.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **50**: " + data.count50.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **SS**: " + data.count_rank_ss + " | **S**: " + data.count_rank_s + " | **A**: " + data.count_rank_a.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
					bot.sendMessage(msg, toSend);
				});

			} else if (suffix.split(" ")[0] === "best") {

				var username = (suffix.split(" ").length < 2) ?  msg.author.username : suffix.substring(5);
				if (!OSU_API_KEY || OSU_API_KEY == "") { bot.sendMessage(msg, "Osu API key not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(OSU_API_KEY);
				osu.getUserBest(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0] || !data[1] || !data[2] || !data[3] || !data[4]) { bot.sendMessage(msg, "⚠ User \"" + username + "\" not found or user doesn't have 5 plays", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var toSend = [];
					toSend.push("Top 5 osu scores for: **" + username + "**:");
					toSend.push("━━━━━━━━━━━━━━━━━━━");
					osu.getBeatmap(data[0].beatmap_id, function(err, map1) {
						toSend.push("**1.** *" + map1.title + "* *(☆" + map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[0].pp.split(".")[0]) + " **| Score:** " + data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[0].countmiss + " **| Date:** " + data[0].date);
						osu.getBeatmap(data[1].beatmap_id, function(err, map2) {
							toSend.push("**2.** *" + map2.title + "* *(☆" + map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[1].pp.split(".")[0]) + " **| Score:** " + data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[1].countmiss + " **| Date:** " + data[1].date);
							osu.getBeatmap(data[2].beatmap_id, function(err, map3) {
								toSend.push("**3.** *" + map3.title + "* *(☆" + map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[2].pp.split(".")[0]) + " **| Score:** " + data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[2].countmiss + " **| Date:** " + data[2].date);
								osu.getBeatmap(data[3].beatmap_id, function(err, map4) {
									toSend.push("**4.** *" + map4.title + "* *(☆" + map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[3].pp.split(".")[0]) + " **| Score:** " + data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[3].countmiss + " **| Date:** " + data[3].date);
									osu.getBeatmap(data[4].beatmap_id, function(err, map5) {
										toSend.push("**5.** *" + map5.title + "* *(☆" + map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[4].pp.split(".")[0]) + " **| Score:** " + data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[4].countmiss + " **| Date:** " + data[4].date);
										bot.sendMessage(msg, toSend);
					});});});});});
				});

			} else if (suffix.split(" ")[0] === "recent") {

				var username = (suffix.split(" ").length < 2) ? msg.author.username : suffix.substring(7);
				if (!OSU_API_KEY || OSU_API_KEY == "") { bot.sendMessage(msg, "Osu API key not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(OSU_API_KEY);
				osu.getUserRecent(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0]) { bot.sendMessage(msg, "⚠ User \"" + username + "\" not found or no recent plays", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var toSend = [];
					toSend.push("5 most recent plays for: **" + username + "**:");
					toSend.push("━━━━━━━━━━━━━━━━━━━");
					osu.getBeatmap(data[0].beatmap_id, function(err, map1) {
						if (!map1 || !map1.title) { bot.sendMessage(msg, toSend); return; }
						toSend.push("**1.** *" + map1.title + "* *(☆" + map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[0].countmiss);
						if (!data[1]) { bot.sendMessage(msg, toSend); return; }
						osu.getBeatmap(data[1].beatmap_id, function(err, map2) {
							if (!map2 || !map2.title) { bot.sendMessage(msg, toSend); return; }
							toSend.push("**2.** *" + map2.title + "* *(☆" + map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[1].countmiss);
							if (!data[2]) { bot.sendMessage(msg, toSend); return; }
							osu.getBeatmap(data[2].beatmap_id, function(err, map3) {
								if (!map3 || !map3.title) { bot.sendMessage(msg, toSend); return; }
								toSend.push("**3.** *" + map3.title + "* *(☆" + map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[2].countmiss);
								if (!data[3]) { bot.sendMessage(msg, toSend); return; }
								osu.getBeatmap(data[3].beatmap_id, function(err, map4) {
									if (!map4 || !map4.title) { bot.sendMessage(msg, toSend); return; }
									toSend.push("**4.** *" + map4.title + "* *(☆" + map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[3].countmiss);
									if (!data[4]) { bot.sendMessage(msg, toSend); return; }
									osu.getBeatmap(data[4].beatmap_id, function(err, map5) {
										if (!map5 || !map5.title) { bot.sendMessage(msg, toSend); return; }
										toSend.push("**5.** *" + map5.title + "* *(☆" + map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[4].countmiss);
										bot.sendMessage(msg, toSend);
					});});});});});
				});

			} else { bot.sendMessage(msg, correctUsage("osu"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); }
		}
	},
	"rps": {
		desc: "Play Rock Paper Scissors",
		usage: "<rock/paper/scissors>",
		cooldown: 2,
		process: function(bot, msg, suffix) {
			var choice = Math.floor(Math.random() * 3);
			if (choice == 0) { bot.sendMessage(msg, "I picked **rock**");
			} else if (choice == 1) { bot.sendMessage(msg, "I picked **paper**");
			} else if (choice == 2) { bot.sendMessage(msg, "I picked **scissors**"); }
		}
	},
	"weather": {
		desc: "Get the weather",
		usage: "<City/City,Us> or <zip/zip,us>	example: ]weather 12345,us",
		deleteCommand: true,
		cooldown: 7,
		process: function(bot, msg, suffix) {
			if (OWM_API_KEY == null || OWM_API_KEY == "") { bot.sendMessage(msg, "⚠ No API key defined by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (suffix) { suffix = suffix.replace(" ", ""); }
			if (!suffix) { bot.sendMessage(msg, correctUsage("weather"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			var rURL = (/\d/.test(suffix) == false) ? "http://api.openweathermap.org/data/2.5/weather?q=" + suffix + "&APPID=" + OWM_API_KEY : "http://api.openweathermap.org/data/2.5/weather?zip=" + suffix + "&APPID=" + OWM_API_KEY;
			request(rURL, function(error, response, body) {
				if (!error && response.statusCode == 200) {
					body = JSON.parse(body);
					if (!body.hasOwnProperty("weather")) { return; }
					var tempF = Math.round(parseInt(body.main.temp) * (9 / 5) - 459.67) + " °F";
					var tempC = Math.round(parseInt(body.main.temp) - 273.15) + " °C";
					var windspeedUS = Math.round(parseInt(body.wind.speed) * 2.23694) + " mph";
					var windspeed = body.wind.speed + " m/s";
					var emoji = "☀";
					if (body.weather[0].description.indexOf("cloud") > -1) { emoji = "☁"; }
					if (body.weather[0].description.indexOf("snow") > -1) { emoji = "❄"; }
					if (body.weather[0].description.indexOf("rain") > -1 || body.weather[0].description.indexOf("storm") > -1 || body.weather[0].description.indexOf("drizzle") > -1) { emoji = "☔"; }
					bot.sendMessage(msg, emoji + " __Weather for " + body.name + "__:\n**Conditions:** " + body.weather[0].description + " **Temp:** " + tempF + " / " + tempC + "\n**Humidity:** " + body.main.humidity + "% **Wind:** " + windspeedUS + " / " + windspeed + " **Cloudiness:** " + body.clouds.all + "%");
				} else { console.log(error); }
			});
		}
	},
	"google": {
		desc: "Let me Google that for you",
		deleteCommand: true,
		usage: "<search>",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, "**http://www.lmgtfy.com/?q=lmgtfy**"); return; }
			suffix = suffix.split(" ");
			for (var i = 0; i < suffix.length; i++) { suffix[i] = encodeURIComponent(suffix[i]); }
			bot.sendMessage(msg, "🔍 **http://www.lmgtfy.com/?q=" + suffix.join("+") + "**");
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
				if (error) { bot.sendMessage(msg, "Error: " + error, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
				if (response.statusCode != 200) { bot.sendMessage(msg, "Got status code " + response.statusCode, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
				if (!error && response.statusCode == 200) {
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
		process: function(bot, msg, suffix) {
			request("http://catfacts-api.appspot.com/api/facts", function(error, response, body) {
				if (error) { bot.sendMessage(msg, "Error: " + error, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (response.statusCode != 200) { bot.sendMessage(msg, "Got status code " + response.statusCode, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
				if (!error && response.statusCode == 200) {
					body = JSON.parse(body);
					bot.sendMessage(msg, "🐱 **" + msg.author.username + "**, did you know that " + body.facts[0]);
				}
			});
		}
	},
	"ratewaifu": {
		desc: "I'll rate your waifu",
		usage: "<name>",
		deleteCommand: false,
		cooldown: 4,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, correctUsage("ratewaifu"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (msg.mentions.length > 1) { bot.sendMessage(msg, "Multiple mentions aren't allowed!", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); return; }
			if (suffix.toLowerCase().replace("-", " ") == bot.user.username.toLowerCase().replace("-", " ")) { bot.sendMessage(msg, "I'd rate myself **10/10**"); return; }
			var fullName = "", user = false;
			if (!msg.channel.isPrivate) { user = msg.channel.server.members.find((member) => { return (member === undefined || member.username == undefined) ? false : member.username.toLowerCase() == suffix.toLowerCase() }); } else { user = false; }
			if (!user && msg.mentions.length < 1) {
				Object.keys(waifus).map(function(name) {if (name.toLowerCase() == suffix.toLowerCase()) { fullName = name; return; }});
				if (!fullName) { Object.keys(waifus).map(function(name) {if (name.split(" ")[0].toLowerCase() == suffix.toLowerCase()) {fullName = name; return;}}); }
				if (!fullName) { Object.keys(waifus).map(function(name) {if (name.split(" ").length > 1) {for (var i = 1;i < name.split(" ").length;i++) {if (name.split(" ")[i].toLowerCase() == suffix.toLowerCase()) {fullName = name; return;}}}}); }
			} else {
				if (msg.mentions.length > 0) { fullName = msg.mentions[0].username; if (msg.mentions[0].username == bot.user.username) { bot.sendMessage(msg, "I'd rate myself **10/10**"); return; }
				} else if (user) { fullName = user.username; }
			}
			if (fullName) {
				if (Ratings.hasOwnProperty(fullName.toLowerCase())) { bot.sendMessage(msg, "I gave " + fullName + " a **" + Ratings[fullName.toLowerCase()] + "/10**"); } //already rated
				else {
					if (user || msg.mentions.length > 0) { bot.sendMessage(msg, "I'd rate " + fullName + " **" + generateUserRating(bot, msg, fullName) + "/10**");
					} else { bot.sendMessage(msg, "I'd rate " + fullName + " **" + generateJSONRating(fullName) + "/10**"); }
				}
			} else {
				if (Ratings.hasOwnProperty(suffix.toLowerCase())) { bot.sendMessage(msg, "I gave " + suffix + " a **" + Ratings[suffix.toLowerCase()] + "/10**"); return; } //already rated
				bot.sendMessage(msg, "I give " + suffix + " a **" + generateRandomRating(suffix.toLowerCase(), true) + "/10**");
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
					bot.servers.map((server) => { if (server.members.indexOf(msg.mentions[0]) > -1) ss += ", " + server.name; });
					if (ss != "none") bot.sendMessage(msg, "**Shared Servers for " + msg.mentions[0].username.replace("@", "@ ") + ":** `" + ss.substring(6).replace("@", "@ ") + "`");
					else bost.sendMessage(msg, "Somehow I don't share any servers with that user", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else if (suffix) {
					var usr = findUser(msg.channel.server.members, suffix);
					if (usr) {
						var ss = "none";
						bot.servers.map((server) => { if (server.members.indexOf(usr) > -1) ss += ", " + server.name; });
						if (ss != "none") bot.sendMessage(msg, "**Shared Servers for " + usr.username.replace("@", "@ ") + ":** `" + ss.substring(6).replace("@", "@ ") + "`");
						else bost.sendMessage(msg, "Somehow I don't share any servers with that user", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					} else bot.sendMessage(msg, "User not found", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
				} else bot.sendMessage(msg, correctUsage("shared"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
			} else bot.sendMessage(msg, "This command can't be used in a PM", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
		}
	},
	"image": {
		desc: "Get an image from Imgur",
		usage: "<subreddit> [--nsfw] [--day | --week | --month | --year | --all]",
		deleteCommand: false, cooldown: 10,
		process: function(bot, msg, suffix) {
			if (!IMGUR_CLIENT_ID || IMGUR_CLIENT_ID == "") { bot.sendMessage(msg, "⚠ No API key defined by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (/[\uD000-\uF8FF]/g.test(suffix)) { bot.sendMessage(msg, "Search cannot contain unicode characters.", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (suffix && /^[^-].*/.test(suffix)) {
				var time = (/(--day|--week|--month|--year|--all)/.test(suffix)) ? /(--day|--week|--month|--year|--all)/.exec(suffix)[0] : '--week';
				request({
						url: 'https://api.imgur.com/3/gallery/r/' + suffix.replace(/(--day|--week|--month|--year|--all|--nsfw|\/r\/| )/g, '') + '/top/' + time.substring(2) + '/50',
						headers: {'Authorization': 'Client-ID ' + IMGUR_CLIENT_ID}
				}, (error, response, body) => {
					if (error) { console.log(error); bot.sendMessage(msg, "Oh no! There was an error!"); }
					else if (response.statusCode != 200) bot.sendMessage(msg, "Got status code " + response.statusCode, (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					else if (body) {
						body = JSON.parse(body);
						var sendNSFW = (/ ?--nsfw/i.test(suffix)) ? true : false;
						if (body.hasOwnProperty("data") && body.data.length !== 0) {
							for (var i = 0; i < 100; i++) {
								var toSend = body.data[Math.floor(Math.random() * (body.data.length))];
								if (!sendNSFW && toSend.nsfw != true) { bot.sendMessage(msg, toSend.link); break; }
								else if (sendNSFW && toSend.nsfw == true) { bot.sendMessage(msg, toSend.link + '**(NSFW)**'); break; }
							}
						} else bot.sendMessage(msg, "Nothing found!", (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
					}
				});
			} else bot.sendMessage(msg, correctUsage("image"), (erro, wMessage) => { bot.deleteMessage(wMessage, {"wait": 10000}); });
		}
	}
};

exports.commands = commands;
exports.aliases = aliases;
