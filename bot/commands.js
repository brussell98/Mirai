var config = require("./config.json");
var games = require("./games.json").games;
var perms = require("./permissions.json");
var version = require("../package.json").version;
var chatlog = require("./logger.js").ChatLog;
var logger = require("./logger.js").Logger;

var request = require('request');
var xml2js = require('xml2js');
var fs = require('fs');

//voting vars
var topicstring = "";
var voter = [];
var upvote = 0;
var downvote = 0;
var votebool = false;

/*
====================
Functions
====================
*/

function correctUsage(cmd) {
	var msg = "Usage: `" + config.command_prefix + "" + cmd + " " + commands[cmd].usage+"`";
	return msg;
}

function givePerm(lvl, usr, msg) {
	if (!perms.hasOwnProperty(usr.id)) {
		permst = perms;
		var value = {
			"level": parseInt(lvl)
		}
		permst[usr.id] = value;
		fs.writeFile("./bot/permissions.json", JSON.stringify(permst, null, '\t'), null);
	} else {
		if (perms[usr.id].level != 3) {
			permst = perms;
			permst[usr.id].level = parseInt(lvl);
			fs.writeFile("./bot/permissions.json", JSON.stringify(permst, null, '\t'), null);
		}
	}
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
				msgArray.push("Moderation related commands can be found with " + config.mod_command_prefix + "help [command].");
				msgArray.push("You can also find command info at https:/\/github.com/brussell98/BrussellBot/wiki/Commands");
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
					if (commands[suffix].hasOwnProperty("cooldown")) { msgArray.push("**Cooldown: **" + commands[suffix].cooldown + " seconds"); }
					bot.sendMessage(msg.author, msgArray);
				} else { bot.sendMessage(msg.author, "Command `" + suffix + "` not found."); }
			}
		}
	},
	"ping": {
		desc: "Replies with pong.",
		permLevel: 0,
		process: function(bot, msg) {
			var n = Math.floor(Math.random() * 3)
			if (n == 0) { bot.sendMessage(msg, "pong");} 
			if (n == 1) { bot.sendMessage(msg, "pongu");} 
			if (n == 2) { bot.sendMessage(msg, "pong!");} 
		}
	},
	"joins": {
		desc: "Accepts the invite sent to it.",
		usage: "<invite link> [-a (announce presence)]",
		permLevel: 0,
		process: function (bot, msg, suffix) {
			if (suffix) {
				var invite = suffix.split(" ")[0];
				bot.joinServer(invite, function (err, server) {
					if (err) {
						bot.sendMessage(msg, "Failed to join: " + err);
						logger.log("warn", err);
					} else {
						logger.log("info", "Joined server: " + server);
						bot.sendMessage(msg, "Successfully joined ***" + server + "***. Please use `"+config.mod_command_prefix+"reload`");
						givePerm("2", server.owner);
						logger.log("info", "Updated " + usr.username + "s perm level to 2");
						if (suffix.split(" ")[1] == "-a") {
							var msgArray = [];
							msgArray.push("Hi! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author + ".");
							msgArray.push("You can use `" + config.command_prefix + "help` to see what I can do. Mods can use "+config.mod_command_prefix+"help for mod commands.");
							msgArray.push("If I shouldn't be here someone with the `Kick Members` permission can use `" + config.mod_command_prefix + "leaves` to make me leave");
							bot.sendMessage(server.defaultChannel, msgArray);
						}
					}
				});
			} else { bot.sendMessage(msg, correctUsage("joins")); }
		}
	},
	"about": {
		desc: "Info about the bot.",
		permLevel: 0,
		process: function(bot, msg, suffix) {
			var msgArray = [];
			msgArray.push("I'm " + bot.user.username + " and I was made by brussell98.");
			msgArray.push("I run on the unofficial Discord API `Discord.js`");
			msgArray.push("My website is http://brussell98.github.io/bot.html");
			bot.sendMessage(msg, msgArray);
		}
	},
	"letsplay": {
		desc: "Ask if anyone wants to play a game.",
		permLevel: 0,
		usage: "[game name]",
		cooldown: 10,
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
			bot.startTyping(msg.channel);
			request('https://rolz.org/api/?' + dice + '.json', function(err, response, body) {
				if (!err && response.statusCode == 200) {
					var roll = JSON.parse(body);
					bot.sendMessage(msg, "Your " + roll.input + " resulted in " + roll.result + " " + roll.details);
				} else { logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode); }
			});
			bot.stopTyping(msg.channel);
		}
	},
	"announce": {
		desc: "Sends a message to all users in the server. (1 message per second)",
		permLevel: 0,
		usage: "<message>",
		cooldown: 30,
		process: function (bot, msg, suffix) {
			if (suffix) {
				if (!msg.channel.isPrivate && msg.author.id == msg.channel.server.owner.id) {
					if (msg.channel.server.members < 151) {
						msg.channel.server.members.forEach(function (usr) {
							setTimeout(bot.sendMessage(usr, suffix + " - " + msg.author), 1000);
						});
						logger.log("info", "Announced \"" + suffix + "\" to members");
					}
				} else if (msg.channel.isPrivate && perms.hasOwnProperty(msg.author.id)) {
					if (perms[msg.author.id].level == 3) {
						bot.servers.forEach(function (ser) {
							if (ser.members < 101) {
								bot.sendMessage(ser.defaultChannel, suffix + " - " + msg.author);
							}
						});
						logger.log("info", "Announced \"" + suffix + "\" to servers");
					} else { bot.sendMessage(msg, "Need perm level 3"); }
				}
			}
		}
	},
	"info": {
		desc: "Gets info on the server or a user if specified.",
		permLevel: 0,
		usage: "[@username]",
		cooldown: 5,
		process: function (bot, msg, suffix) {
			if (suffix) {
				if (msg.mentions.length == 0) { bot.sendMessage(msg, correctUsage("info")); return; }
				msg.mentions.map(function (usr) {
					var msgArray = [];
					msgArray.push("You requested info on **" + usr.username + "**");
					msgArray.push("User ID: `" + usr.id + "`");
					if (perms.hasOwnProperty(usr.id)) { msgArray.push("Permission Level: `" + perms[usr.id].level + "`"); }
					if (usr.gameID != null) { msgArray.push("Staus: `" + usr.status + "` playing `" + usr.gameID + "`"); } //waiting for lib fix
					else { msgArray.push("Staus: `" + usr.status + "`"); }
					var myDate = new Date(msg.channel.server.detailsOfUser(usr).joinedAt);
					msgArray.push("Joined this server on: `" + myDate.toUTCString() + "`");
					var rsO = msg.channel.server.rolesOfUser(usr.id)
					var rols = "undefined@everyone, ";
					for (rO of rsO) { rols += (rO.name + ", "); }
					msgArray.push("Roles: `" + rols.substring(9, rols.length - 2) + "`");
					if (usr.avatarURL != null) { msgArray.push("Avatar: `" + usr.avatarURL + "`"); }
					bot.sendMessage(msg, msgArray);
					logger.log("info", "Got info on " + usr.username);
				});
			} else {
				if (msg.channel.server) {
					var msgArray = [];
					msgArray.push("You requested info on **" + msg.channel.server.name + "**");
					msgArray.push("Server ID: `" + msg.channel.server.id + "`");
					msgArray.push("Owner: " + msg.channel.server.owner + " (id: `" + msg.channel.server.owner.id + "`)");
					msgArray.push("Region: `" + msg.channel.server.region + "`");
					var rsO = msg.channel.server.roles;
					var rols = "undefined@everyone, ";
					for (rO of rsO) { rols += (rO.name + ", "); }
					msgArray.push("Roles: `" + rols.substring(9, rols.length -2) + "`");
					msgArray.push("Default channel: #" + msg.channel.server.defaultChannel.name + "");
					msgArray.push("This channel's id: `" + msg.channel.id + "`");
					msgArray.push("Icon URL: `" + msg.channel.server.iconURL + "`");
					bot.sendMessage(msg, msgArray);
					logger.log("info", "Got info on " + msg.channel.server.name);
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
	},
	"newvote": {
		desc: "Create a new vote.",
		permLevel: 0,
		usage: "<topic>",
		process: function (bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, correctUsage("newvote")); return; }
			if (votebool == true) { bot.sendMessage(msg, "Theres already a vote pending!"); return; }
			topicstring = suffix;
			bot.sendMessage(msg, "New Vote started: `" + suffix + "`\nTo vote say `" + config.command_prefix + "vote +/-`");
			votebool = true;
		}
	},
	"vote": {
		desc: "Vote.",
		permLevel: 0,
		usage: "<+/->",
		process: function (bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, correctUsage("vote")); return; }
			if (votebool == false) { bot.sendMessage(msg, "There isn't a topic being voted on right now! Use "+config.command_prefix+"newvote <topic>"); return; }
			if (voter.indexOf(msg.author) != -1) { return; }
			voter.push(msg.author);
			var vote = suffix.split(" ")[0]
			if (vote == "+") { upvote += 1; }
			if (vote == "-") { downvote += 1; }
		}
	},
	"endvote": {
		desc: "End current vote.",
		permLevel: 0,
		process: function (bot, msg, suffix) {//get percents
			bot.sendMessage(msg, "**Results of last vote:**\nTopic: `" + topicstring + "`\nUpvotes: `" + upvote + " " + (upvote/(upvote+downvote))*100 + "%`\nDownvotes: `" + downvote + " " + (downvote/(upvote+downvote))*100 + "%`");
			upvote = 0;
			downvote = 0;
			voter = [];
			votebool = false;
			topicstring = "";
		}
	},
	"ask": {
		desc: "Ask the bot a question (8ball).",
		permLevel: 0,
		usage: "",
		process: function (bot, msg) {
			var responses = ["It is certain", "It is decidedly so", "Without a doubt", "Yes, definitely", "You may rely on it", "As I see it, yes", "Most likely", "Outlook good", "Yes", "Signs point to yes", "Reply hazy try again", "Ask again later", "Better not tell you now", "Cannot predict now", "Concentrate and ask again", "Don't count on it", "My reply is no", "My sources say no", "Outlook not so good", "Very doubtful"];
			var choice = Math.floor(Math.random() * (responses.length));
			bot.sendMessage(msg, responses[choice]);
		}
	},
	"anime": {
		desc: "Gets the details on an anime from MAL.",
		permLevel: 0,
		usage: "<anime name>",
		process: function (bot, msg, suffix) {
			if (suffix) {
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/anime/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": process.env.mal_user, "pass": process.env.mal_pass, "sendImmediately": false}}, function (error, response, body) {
					if (error) { logger.log("info", error); }
					if (!error && response.statusCode == 200) {
						xml2js.parseString(body, function (err, result){
							var title = result.anime.entry[0].title;
							var english = result.anime.entry[0].english;
							var ep = result.anime.entry[0].episodes;
							var score = result.anime.entry[0].score;
							var type = result.anime.entry[0].type;
							var status = result.anime.entry[0].status;
							var synopsis = result.anime.entry[0].synopsis.toString();
							synopsis = synopsis.replace(/&mdash;/g, "—");
							synopsis = synopsis.replace(/&hellip;/g, "...");
							synopsis = synopsis.replace(/<br \/>/g, " ");
							synopsis = synopsis.replace(/&quot;/g, "\"");
							synopsis = synopsis.replace(/\r?\n|\r/g, " ");
							synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*");
							synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = synopsis.replace(/\[(.{1,10})\]/g, "");
							synopsis = synopsis.substring(0, 300);
							bot.sendMessage(msg, "**" + title + " / " + english+"**\n**Type:** "+ type +", **Episodes:** "+ep+", **Status:** "+status+", **Score:** "+score+"\n"+synopsis);
						});
					}
				});
				bot.stopTyping(msg.channel);
			} else {
				bot.sendMessage(msg, correctUsage("anime"));
			}
		}
	},
	/*"db-query": {
		desc: "Query the message database [EXPERIMENTAL]",
		permLevel: 1,
		usage: "<count/print/author/server/channel> <term>",
		cooldown: 10,
		process: function(bot, msg, suffix) {
			if (config.log_messages) {
			fs.readFile("./logs/messages.txt", 'utf8', function (err, data) {
				if (err) { logger.log("warn", "Error getting chat logs: " + err); }
				logger.log("debug", "Fetched chat logs");
				data = data.split(/\r?\n/);
				type = suffix.split(" ")[0];
				term = suffix.substring(type.length + 1);
				if (type == "count") {
					var count = 0;
					for (line of data) {
						line = line.replace(/(.*) -> (.*) said /, "");
						if (line.indexOf(term) != -1) { count += 1; }
					}
					bot.sendMessage(msg, "Found **" + count + "** messages with *" + term + "* in the logs.");
					delete data;
				} else if (type == "print") {
					var amount = 10;
					var count = 0;
					var msgArray = [];
					for (var i = data.length - 1; i >= 0; i--) {
						data[i] = data[i].replace(/(.*) -> (.*) said /, "");
						if (data[i].indexOf(term) != -1) { msgArray.push(data[i]+"\n"); count += 1; }
						if (i == 0) { bot.sendMessage(msg, "Printing **" + amount + "** messages with *" + term + "* from the logs.\n"+msgArray); }
						if (count >= amount) { bot.sendMessage(msg, "Printing **" + amount + "** messages with *" + term + "* from the logs.\n"+msgArray); return; }
					}
				} else if (type == "author") {
					count = 0;
					for (line of data) {
						line = line.replace(/(.*): (.*) --> (.*) -> /, "");
						line = line.replace(/ said (.*)/, "");
						if (line.equals(term)) { count += 1; }
					}
					bot.sendMessage(msg, "I have **" + count + "** messages from " + term + " in the logs.");
				} else if (type == "server") {
					var count = 0;
					for (line of data) {
						line = line.replace(/(.*): /, "");
						line = line.replace(/ --> (.*) -> (.*)/, "");
						if (line.equals(term)) { count += 1; }
					}
					bot.sendMessage(msg, "I have **" + count + "** messages from " + term + " in the logs.");
				} else if (type == "channel") {
					var count = 0;
					for (line of data) {
						line = line.replace(/(.*): (.*) --> /, "");
						line = line.replace(/ ->(.*)/, "");
						if (line.equals(term)) { count += 1; }
					}
					bot.sendMessage(msg, "I have **" + count + "** messages from " + term + " in the logs.");
				} else { bot.sendMessage(msg, correctUsage("db-query")); delete data; }
			});
			} else { bot.sendMessage(msg, "Message logging is currently disabled"); }
		}
	},*/
	"coinflip": {
		desc: "Flips a coin",
		permLevel: 0,
		usage: "",
		process: function(bot, msg, suffix) {
			var side = Math.floor(Math.random() * (2));
			if (side == 0) {
				bot.sendMessage(msg, "Heads");
			} else {
				bot.sendMessage(msg, "Tails");
			}
		}
	}
};

exports.commands = commands;
