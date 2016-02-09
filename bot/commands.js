/// <reference path="../typings/main.d.ts" />
var config = require("./config.json");
var games = require("./games.json").games;
var version = require("../package.json").version;
var colors = require("./styles.js");
var request = require("request");
var xml2js = require("xml2js");
var osuapi = require("osu-api");
var ent = require("entities");
var waifus = require("./waifus.json");

var VoteDB = {};
var LottoDB = {};
var Ratings = {};

/*
====================
Functions
====================
*/

function correctUsage(cmd) {
	var msg = "Usage: `" + config.command_prefix + "" + cmd + " " + commands[cmd].usage + "`";
	return msg;
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
	var score = generateRandomRating() - 1;
	var joined = new Date(msg.channel.server.detailsOfUser(user).joinedAt), now = new Date();
	if (now.valueOf() - joined.valueOf() >= 2592000000) { score += 1; } //if user has been on the server for at least one month +1
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
	var score = Math.floor((Math.random() * ((parseInt(ranges[ranking].split("-")[1], 10) + 1 - parseInt(ranges[ranking].split("-")[0], 10)))) + parseInt(ranges[ranking].split("-")[0], 10)); //(floor of rand * ((max+1)-min)) - min
	var moreRandom = Math.floor(Math.random() * 4); //0-3
	if (score > 1 && moreRandom === 0) { score -= 1; } else if (score < 10 && moreRandom == 3) { score += 1; }
	Ratings[fullName.toLowerCase()] = score;
	return score;
}

/*
====================
Commands (Check https://github.com/brussell98/BrussellBot/wiki/New-Command-Guide for how to make new ones)
====================
*/

var aliases = {
	"h": "help", "commands": "help",
	"server": "botserver",
	"backwards": "reverse",
	"p": "ping",
	"j": "join", "joins": "join",
	"lp": "letsplay", "play": "letsplay",
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
	"r": "ratewaifu", "rate": "ratewaifu", "waifu": "ratewaifu"
};

var commands = {
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]",
		deleteCommand: true, shouldDisplay: false, cooldown: 1,
		process: function(bot, msg, suffix) {
			var msgArray = [];
			if (!suffix) {
				msgArray.push("Use `" + config.command_prefix + "help <command name>` to get info on a specific command.");
				msgArray.push("Mod commands can be found with `" + config.mod_command_prefix + "help [command]`.");
				msgArray.push("You can also find examples and more at __github.com/brussell98/BrussellBot/wiki/Commands__");
				msgArray.push("**Commands:**\n");
				msgArray.push("`@" + bot.user.username + " text`\n		Talk to the bot (cleverbot)");
				Object.keys(commands).forEach(function(cmd) {
					if (commands[cmd].hasOwnProperty("shouldDisplay")) {
						if (commands[cmd].shouldDisplay) { msgArray.push("`" + config.command_prefix + cmd + " " + commands[cmd].usage + "`\n		" + commands[cmd].desc); }
					} else { msgArray.push("`" + config.command_prefix + cmd + " " + commands[cmd].usage + "`\n		" + commands[cmd].desc); }
				});
				var helpMessage = msgArray.join("\n");
				var helpPart2 = helpMessage.substring(helpMessage.indexOf("`]lotto`"));
				var helpPart1 = helpMessage.substring(0, helpMessage.indexOf("`]lotto`") - 1);
				bot.sendMessage(msg.author, helpPart1);
				bot.sendMessage(msg.author, helpPart2);
			} else {
				suffix = suffix.trim().toLowerCase();
				if (commands.hasOwnProperty(suffix)) {
					msgArray.push("**" + config.command_prefix + "" + suffix + ":** " + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { msgArray.push("**Usage:** `" + config.command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { msgArray.push("**Cooldown:** " + commands[suffix].cooldown + " seconds"); }
					if (commands[suffix].hasOwnProperty("deleteCommand")) { msgArray.push("*Delete Command: true*"); }
					bot.sendMessage(msg, msgArray);
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
		desc: "Return's the input backwards",
		usage: "<text>", deleteCommand: true, cooldown: 5, shouldDisplay: false,
		process: function(bot, msg, suffix) {
			if (suffix) { bot.sendMessage(msg, "\u202e " + suffix); }
		}
	},
	"ping": {
		desc: "Replies with pong.",
		cooldown: 2, shouldDisplay: false, usage: "",
		process: function(bot, msg) {
			var n = Math.floor(Math.random() * 6);
			if (n === 0) { bot.sendMessage(msg, "pong");
			} else if (n === 1) { bot.sendMessage(msg, "You thought I'd say pong, *didn't you?*");
			} else if (n === 2) { bot.sendMessage(msg, "pong!");
			} else if (n === 3) { bot.sendMessage(msg, "Yeah, I'm still here");
			} else if (n === 4) { bot.sendMessage(msg, "...");
			} else if (n === 5) { bot.sendMessage(msg, config.command_prefix + "ping"); }
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
							} else if (!server || server.name == undefined || server.roles == undefined || server.channels == undefined || server.members == undefined) {
								console.log(colors.cWarn(" WARN ") + "Error joining server. Didn't receive all data.");
								bot.sendMessage(msg, "⚠ Failed to receive all data, please try again.");
								try {
									server.leave();
								} catch (error) { /*how did it get here?*/ }
							} else if (cServers.indexOf(server.id) > -1) {
								console.log("Already in server");
								bot.sendMessage(msg, "I'm already in that server!");
							} else {
								if (config.is_heroku_version) {
									if (process.env.banned_server_ids && process.env.banned_server_ids.indexOf(server.id) > -1) {
										console.log(colors.cRed("Joined server but it was on the ban list") + ": " + server.name);
										bot.sendMessage(msg, "This server is on the ban list");
										bot.leaveServer(server);
										return;
									}
								} else {
									if (config.banned_server_ids && config.banned_server_ids.indexOf(server.id) > -1) {
										console.log(colors.cRed("Joined server but it was on the ban list") + ": " + server.name);
										bot.sendMessage(msg, "This server is on the ban list");
										bot.leaveServer(server);
										return;
									}
								}
								console.log(colors.cGreen("Joined server: ") + server.name);
								bot.sendMessage(msg, "✅ Successfully joined ***" + server.name + "***");
								if (suffix.indexOf("-a") != -1) {
									var msgArray = [];
									msgArray.push("Hi! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author + ".");
									msgArray.push("Use `" + config.command_prefix + "help` to get a list of normal commands.");
									msgArray.push("Mod/Admin commands ~~including bot settings~~ (WIP) can be viewed with `" + config.mod_command_prefix + "`help ");
									msgArray.push("For help / feedback / bugs / testing / announcements / changelogs / etc. go to **discord.gg/0kvLlwb7slG3XCCQ**");
									bot.sendMessage(server.defaultChannel, msgArray);
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
			bot.sendMessage(msg, "I'm " + bot.user.username + " and ~~I was made by brussell98.~~ I'm a strong independent bot who don't need no creator.\nI run on `discord.js` and my website is **brussell98.github.io/BrussellBot/**");
		}
	},
	"letsplay": {
		desc: "Ask if anyone wants to play a game. (@ everyone if members <= 30)",
		deleteCommand: true,
		usage: "[game name]",
		cooldown: 15,
		process: function(bot, msg, suffix) {
			if (!msg.channel.isPrivate && msg.channel.permissionsOf(msg.author).hasPermission("mentionEveryone") && msg.channel.server.members.length <= 30) {
				if (suffix) { bot.sendMessage(msg, "🎮 @everyone, " + msg.author + " would like to know if anyone wants to play **" + suffix + "**.");
				} else { bot.sendMessage(msg, "🎮 @everyone, " + msg.author + " would like to know if anyone wants to play a game"); }
			} else {
				if (suffix) { bot.sendMessage(msg, "🎮 " + msg.author + " would like to know if anyone wants to play **" + suffix + "**.");
				} else { bot.sendMessage(msg, "🎮 " + msg.author + " would like to know if anyone wants to play a game"); }
			}
		}
	},
	"dice": {
		desc: "Roll dice. (1d6 by default)",
		deleteCommand: true,
		usage: "[(rolls)d(sides)]",
		cooldown: 3,
		process: function(bot, msg, suffix) {
			var dice = "1d6";
			if (suffix && /\d+d\d+/.test(suffix)) { dice = suffix; }
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
							var msgArray = [], count = 0;
							msgArray.push("ℹ **Info on** " + usr.username + " (" + usr.discriminator + ")");
							msgArray.push("**ID:** " + usr.id);
							if (usr.game && usr.game !== undefined && usr.game !== null && usr.game !== "null") { msgArray.push("**Status:** " + usr.status + " **last playing** " + usr.game.name);
							} else { msgArray.push("**Status:** " + usr.status); }
							var jDate = new Date(msg.channel.server.detailsOfUser(usr).joinedAt);
							msgArray.push("**Joined on:** " + jDate.toUTCString());
							var roles = msg.channel.server.rolesOfUser(usr.id).map(function(role) { return role.name; });
							roles = roles.join(", ").replace("@", "");
							if (roles.length <= 1500) { msgArray.push("**Roles:** `" + roles + "`"); } else { msgArray.push("**Roles:** `Too many to display`"); }
							bot.servers.map(function(server) { if (server.members.indexOf(usr) > -1) { count += 1; } });
							if (count > 1) { msgArray.push("**Shared servers:** " + count); }
							if (usr.avatarURL != null) { msgArray.push("**Avatar URL:** `" + usr.avatarURL + "`"); }
							bot.sendMessage(msg, msgArray);
							if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Got info on " + usr.username); }
						});
					} else {
						if (msg.everyoneMentioned) { bot.sendMessage(msg, "Hey, " + msg.author.username + ", don't do that ok?", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						var users = suffix.split(/, ?/);
						if (users.length > 4) { bot.sendMessage(msg, "Limit of 4 users", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						users.map(function(user) {
							var usr = msg.channel.server.members.find((member) => { return member.username.toLowerCase() == user.toLowerCase() });
							if (!usr) { usr = msg.channel.server.members.find((member) => { return member.username.toLowerCase().indexOf(user.toLowerCase()) == 0 }); }
							if (!usr) { usr = msg.channel.server.members.find((member) => { return member.username.toLowerCase().indexOf(user.toLowerCase()) > -1 }); }
							if (usr) {
								var msgArray = [], count = 0;
								msgArray.push("ℹ **Info on** " + usr.username + " (" + usr.discriminator + ")");
								msgArray.push("**ID:** " + usr.id);
								if (usr.game && usr.game !== undefined && usr.game !== null && usr.game !== "null") { msgArray.push("**Status:** " + usr.status + " **last playing** " + usr.game.name);
								} else { msgArray.push("**Status:** " + usr.status); }
								var jDate = new Date(msg.channel.server.detailsOfUser(usr).joinedAt);
								msgArray.push("**Joined on:** " + jDate.toUTCString());
								var roles = msg.channel.server.rolesOfUser(usr.id).map((role) => { return role.name; });
								roles = roles.join(", ").replace("@", "");
								if (roles.length <= 1500) { msgArray.push("**Roles:** `" + roles + "`"); } else { msgArray.push("**Roles:** `Too many to display`"); }
								bot.servers.map(function(server) { if (server.members.indexOf(usr) > -1) { count += 1; } });
								if (count > 1) { msgArray.push("**Shared servers:** " + count); }
								if (usr.avatarURL != null) { msgArray.push("**Avatar URL:** `" + usr.avatarURL + "`"); }
								bot.sendMessage(msg, msgArray);
								if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Got info on " + usr.username); }
							} else { bot.sendMessage(msg, "User \"" + user + "\" not found. If you want to get info on multiple users separate them with a comma.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); }
						});
					}
				} else {
					var msgArray = [];
					msgArray.push("ℹ **Info on** " + msg.channel.server.name);
					msgArray.push("**Server ID:** " + msg.channel.server.id);
					msgArray.push("**Owner:** " + msg.channel.server.owner.username + " (**ID:** " + msg.channel.server.owner.id + ")");
					msgArray.push("**Region:** " + msg.channel.server.region);
					msgArray.push("**Members:** " + msg.channel.server.members.length + " **Channels:** " + msg.channel.server.channels.length);
					var roles = msg.channel.server.roles.map((role) => { return role.name; });
					roles = roles.join(", ").replace("@", "");
					if (roles.length <= 1500) { msgArray.push("**Roles:** `" + roles + "`"); } else { msgArray.push("**Roles:** `Too many to display`"); }
					msgArray.push("**Default channel:** " + msg.channel.server.defaultChannel);
					msgArray.push("**This channel's id:** " + msg.channel.id);
					msgArray.push("**Icon URL:** `" + msg.channel.server.iconURL + "`");
					bot.sendMessage(msg, msgArray);
					if (config.debug) { console.log(colors.cDebug(" DEBUG ") + "Got info on " + msg.channel.server.name); }
				}
			} else { bot.sendMessage(msg, "⚠ Can't do that in a DM.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
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
					var usr = msg.channel.server.members.find((member) => { return member.username.toLowerCase() == user.toLowerCase() });
					if (!usr) { usr = msg.channel.server.members.find((member) => { return member.username.toLowerCase().indexOf(user.toLowerCase()) == 0 }); }
					if (!usr) { usr = msg.channel.server.members.find((member) => { return member.username.toLowerCase().indexOf(user.toLowerCase()) > -1 }); }
					if (usr) { (usr.avatarURL != null) ? bot.sendMessage(msg, "**" + usr.username + "**'s avatar is: " + usr.avatarURL + "") : bot.sendMessage(msg, "**" + usr.username + "** has no avatar", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
					} else { bot.sendMessage(msg, "User \"" + user + "\" not found. If you want to get the avatar of multiple users separate them with a comma.", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 20000}); }); }
				});
			}
		}
	},
	"choose": {
		desc: "Makes a choice for you.",
		usage: "<option 1>, <option 2>, [option], [option]",
		cooldown: 4,
		process: function(bot, msg, suffix) {
			if (!suffix || /(.*), ?(.*)/.test(suffix) == false) { bot.sendMessage(msg, correctUsage("choose"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			var choices = suffix.split(/, ?/);
			if (choices.length < 2) {
				bot.sendMessage(msg, correctUsage("choose"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else {
				var choice = Math.floor(Math.random() * (choices.length));
				bot.sendMessage(msg, "I chose **" + choices[choice] + "**");
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
				var USER = (config.is_heroku_version) ? process.env.mal_user : config.mal_user;
				var PASS = (config.is_heroku_version) ? process.env.mal_pass : config.mal_pass;
				if (!USER || !PASS) { bot.sendMessage(msg, "MAL login not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/anime/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": USER, "pass": PASS, "sendImmediately": false}}, function(error, response, body) {
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
							synopsis = synopsis.replace(/<br \/>/g, " "); synopsis = synopsis.replace(/\[(.{1,10})\]/g, "");
							synopsis = synopsis.replace(/\r?\n|\r/g, " "); synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*"); synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = ent.decodeHTML(synopsis);
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); synopsis += "..."; }
							}
							bot.sendMessage(msg, "**" + title + " / " + english + "**\n**Type:** " + type + " **| Episodes:** " + ep + " **| Status:** " + status + " **| Score:** " + score + "\n" + synopsis);
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
				var USER = (config.is_heroku_version) ? process.env.mal_user : config.mal_user;
				var PASS = (config.is_heroku_version) ? process.env.mal_pass : config.mal_pass;
				if (!USER || !PASS) { bot.sendMessage(msg, "MAL login not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/manga/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": USER, "pass": PASS, "sendImmediately": false}}, function(error, response, body) {
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
							synopsis = synopsis.replace(/<br \/>/g, " "); synopsis = synopsis.replace(/\[(.{1,10})\]/g, "");
							synopsis = synopsis.replace(/\r?\n|\r/g, " "); synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*"); synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = ent.decodeHTML(synopsis);
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); }
							}
							bot.sendMessage(msg, "**" + title + " / " + english + "**\n**Type:** " + type + " **| Chapters:** " + chapters + " **| Volumes: **" + volumes + " **| Status:** " + status + " **| Score:** " + score + "\n" + synopsis);
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
				var APIKEY = (config.is_heroku_version) ? process.env.osu_api_key : config.osu_api_key;
				if (!APIKEY) { bot.sendMessage(msg, "Osu API key not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(APIKEY);
				osu.getUser(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data) { bot.sendMessage(msg, "⚠ User \"" + username + "\" not found", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var msgArray = [];
					msgArray.push("Osu stats for: **" + data.username + "**:");
					msgArray.push("━━━━━━━━━━━━━━━━━━━");
					msgArray.push("**Play Count**: " + data.playcount.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Ranked Score**: " + data.ranked_score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Total Score**: " + data.total_score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Level**: " + data.level.substring(0, data.level.split(".")[0].length + 3));
					msgArray.push("**PP**: " + data.pp_raw.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Rank**: #" + data.pp_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Country Rank**: #" + data.pp_country_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **Accuracy**: " + data.accuracy.substring(0, data.accuracy.split(".")[0].length + 3) + "%");
					msgArray.push("**300**: " + data.count300.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **100**: " + data.count100.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **50**: " + data.count50.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " | **SS**: " + data.count_rank_ss + " | **S**: " + data.count_rank_s + " | **A**: " + data.count_rank_a.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
					bot.sendMessage(msg, msgArray);
				});

			} else if (suffix.split(" ")[0] === "best") {

				var username = (suffix.split(" ").length < 2) ?  msg.author.username : suffix.substring(5);
				var APIKEY = (config.is_heroku_version) ? process.env.osu_api_key : config.osu_api_key;
				if (!APIKEY) { bot.sendMessage(msg, "Osu API key not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(APIKEY);
				osu.getUserBest(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0] || !data[1] || !data[2] || !data[3] || !data[4]) { bot.sendMessage(msg, "⚠ User \"" + username + "\" not found or user doesn't have 5 plays", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var msgArray = [];
					msgArray.push("Top 5 osu scores for: **" + username + "**:");
					msgArray.push("━━━━━━━━━━━━━━━━━━━");
					osu.getBeatmap(data[0].beatmap_id, function(err, map1) {
						msgArray.push("**1.** *" + map1.title + "* *(☆" + map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[0].pp.split(".")[0]) + " **| Score:** " + data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[0].countmiss + " **| Date:** " + data[0].date);
						osu.getBeatmap(data[1].beatmap_id, function(err, map2) {
							msgArray.push("**2.** *" + map2.title + "* *(☆" + map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[1].pp.split(".")[0]) + " **| Score:** " + data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[1].countmiss + " **| Date:** " + data[1].date);
							osu.getBeatmap(data[2].beatmap_id, function(err, map3) {
								msgArray.push("**3.** *" + map3.title + "* *(☆" + map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[2].pp.split(".")[0]) + " **| Score:** " + data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[2].countmiss + " **| Date:** " + data[2].date);
								osu.getBeatmap(data[3].beatmap_id, function(err, map4) {
									msgArray.push("**4.** *" + map4.title + "* *(☆" + map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[3].pp.split(".")[0]) + " **| Score:** " + data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[3].countmiss + " **| Date:** " + data[3].date);
									osu.getBeatmap(data[4].beatmap_id, function(err, map5) {
										msgArray.push("**5.** *" + map5.title + "* *(☆" + map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length + 3) + ")*: **PP:** " + Math.round(data[4].pp.split(".")[0]) + " **| Score:** " + data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[4].countmiss + " **| Date:** " + data[4].date);
										bot.sendMessage(msg, msgArray);
					});});});});});
				});

			} else if (suffix.split(" ")[0] === "recent") {

				var username = (suffix.split(" ").length < 2) ? msg.author.username : suffix.substring(7);
				var APIKEY = (config.is_heroku_version) ? process.env.osu_api_key : config.osu_api_key;
				if (!APIKEY) { bot.sendMessage(msg, "Osu API key not configured by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(APIKEY);
				osu.getUserRecent(username, function(err, data) {
					if (err) { bot.sendMessage(msg, "⚠ Error: " + err, function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0]) { bot.sendMessage(msg, "⚠ User \"" + username + "\" not found or no recent plays", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var msgArray = [];
					msgArray.push("5 most recent plays for: **" + username + "**:");
					msgArray.push("━━━━━━━━━━━━━━━━━━━");
					osu.getBeatmap(data[0].beatmap_id, function(err, map1) {
						msgArray.push("**1.** *" + map1.title + "* *(☆" + map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[0].countmiss);
						if (!data[1]) { bot.sendMessage(msg, msgArray); return; }
						osu.getBeatmap(data[1].beatmap_id, function(err, map2) {
							msgArray.push("**2.** *" + map2.title + "* *(☆" + map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[1].countmiss);
							if (!data[2]) { bot.sendMessage(msg, msgArray); return; }
							osu.getBeatmap(data[2].beatmap_id, function(err, map3) {
								msgArray.push("**3.** *" + map3.title + "* *(☆" + map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[2].countmiss);
								if (!data[3]) { bot.sendMessage(msg, msgArray); return; }
								osu.getBeatmap(data[3].beatmap_id, function(err, map4) {
									msgArray.push("**4.** *" + map4.title + "* *(☆" + map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[3].countmiss);
									if (!data[4]) { bot.sendMessage(msg, msgArray); return; }
									osu.getBeatmap(data[4].beatmap_id, function(err, map5) {
										msgArray.push("**5.** *" + map5.title + "* *(☆" + map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length + 3) + ")*: **Score:** " + data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Max Combo:** " + data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + " **| Misses:** " + data[4].countmiss);
										bot.sendMessage(msg, msgArray);
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
			//if (!suffix) { bot.sendMessage(msg, correctUsage("rps")); return; }
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
			var APIKEY = (config.is_heroku_version) ? process.env.weather_api_key : config.weather_api_key;
			if (APIKEY == null || APIKEY == "") { bot.sendMessage(msg, "⚠ No API key defined by bot owner", function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (suffix) { suffix = suffix.replace(" ", ""); }
			if (!suffix) { bot.sendMessage(msg, correctUsage("weather"), function(erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			var rURL = (/\d/.test(suffix) == false) ? "http://api.openweathermap.org/data/2.5/weather?q=" + suffix + "&APPID=" + APIKEY : "http://api.openweathermap.org/data/2.5/weather?zip=" + suffix + "&APPID=" + APIKEY;
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
					bot.sendMessage(msg, emoji + " __Weather for " + body.name + "__:\n**Conditions:** " + body.weather[0].description + " **Temp:** " + tempF + " / " + tempC + "\n**Humidity:** " + body.main.humidity + "% **Wind:** " + windspeed + " / " + windspeedUS + " **Cloudiness:** " + body.clouds.all + "%");
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
			var fullName = "";
			if (!msg.channel.isPrivate) { var user = msg.channel.server.members.find((member) => { return member.username.toLowerCase() == suffix.toLowerCase() }); } else { var user = false; }
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
					} else { bot.sendMessage(msg, fullName + " is a **" + generateJSONRating(fullName) + "/10**"); }
				}
			} else {
				if (Ratings.hasOwnProperty(suffix.toLowerCase())) { bot.sendMessage(msg, "I gave " + suffix + " a **" + Ratings[suffix.toLowerCase()] + "/10**"); return; } //already rated
				bot.sendMessage(msg, "I'd say " + suffix + " is a **" + generateRandomRating(suffix.toLowerCase(), true) + "/10**");
			}
		}
	}
};

exports.commands = commands;
exports.aliases = aliases;
