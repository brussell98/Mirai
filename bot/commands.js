var config = require("./config.json");
var games = require("./games.json").games;
var version = require("../package.json").version;
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

/*
====================
Commands (Check https://github.com/brussell98/BrussellBot/wiki/New-Command-Guide for how to make new ones)
====================
*/

var commands = {
	"help": {
		desc: "Sends a DM containing all of the commands. If a command is specified gives info on that command.",
		usage: "[command]",
		process: function(bot, msg, suffix) {
			var msgArray = [];
			if (!suffix){
				var msgArray = [];
				msgArray.push("This is a list of commands. Use `" + config.command_prefix + "help <command name>` to get info on a specific command.");
				msgArray.push("Moderation related commands can be found with `" + config.mod_command_prefix + "help [command]`.");
				msgArray.push("You can also find command info at github.com/brussell98/BrussellBot/wiki/Commands");
				msgArray.push("**Commands: **");
				msgArray.push("```");
				Object.keys(commands).forEach(function(cmd){ msgArray.push("" + config.command_prefix + "" + cmd + ": " + commands[cmd].desc + ""); });
				msgArray.push("```");
				bot.sendMessage(msg.author, msgArray);
			} else {
				if (commands.hasOwnProperty(suffix)){
					var msgArray = [];
					msgArray.push("**" + config.command_prefix + "" + suffix + ": **" + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { msgArray.push("**Usage: **`" + config.command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { msgArray.push("**Cooldown: **" + commands[suffix].cooldown + " seconds"); }
					bot.sendMessage(msg.author, msgArray);
				} else { bot.sendMessage(msg.author, "Command `" + suffix + "` not found."); }
			}
		}
	},
	"ping": {
		desc: "Replies with pong.",
		process: function(bot, msg) {
			var n = Math.floor(Math.random() * 4)
			if (n == 0) { bot.sendMessage(msg, "pong");} 
			else if (n == 1) { bot.sendMessage(msg, "pongu");} 
			else if (n == 2) { bot.sendMessage(msg, "pong!");} 
			else if (n == 3) { bot.sendMessage(msg, "Yeah, I'm still here");} 
		}
	},
	"joins": {
		desc: "Accepts the invite sent to it.",
		usage: "<invite link> [-a (announce presence)]",
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
		process: function(bot, msg, suffix) {
			var msgArray = [];
			msgArray.push("I'm " + bot.user.username + " and I was made by brussell98.");
			msgArray.push("I run on the unofficial Discord API `Discord.js`");
			msgArray.push("My website is brussell98.github.io/bot.html");
			bot.sendMessage(msg, msgArray);
		}
	},
	"letsplay": {
		desc: "Ask if anyone wants to play a game.",
		usage: "[game name]",
		cooldown: 10,
		process: function(bot, msg, suffix) {
			if (suffix) { bot.sendMessage(msg, "@everyone, " + msg.author + " would like to know if anyone wants to play **" + suffix + "**."); }
			else { bot.sendMessage(msg, "@everyone, " + msg.author + " would like to know if anyone wants to play a game"); }
		}
	},
	"roll": {
		desc: "Rolls a die.",
		usage: "[(rolls)d(sides)]",
		process: function(bot, msg, suffix) {
			var dice = "1d6";
			if (suffix) { dice = suffix; }
			bot.startTyping(msg.channel);
			request('https://rolz.org/api/?' + dice + '.json', function(err, response, body) {
				if (!err && response.statusCode == 200) {
					var roll = JSON.parse(body);
					if (roll.details.length <= 100) { bot.sendMessage(msg, "Your " + roll.input + " resulted in " + roll.result + " " + roll.details); }
					else { bot.sendMessage(msg, "Your " + roll.input + " resulted in " + roll.result); }
				} else { logger.log("warn", "Got an error: ", error, ", status code: ", response.statusCode); }
			});
			bot.stopTyping(msg.channel);
		}
	},
	"info": {
		desc: "Gets info on the server or a user if specified.",
		usage: "[@username]",
		cooldown: 5,
		process: function (bot, msg, suffix) {
			if (!msg.channel.isPrivate) {
				if (suffix) {
					if (msg.mentions.length == 0) { bot.sendMessage(msg, correctUsage("info")); return; }
					msg.mentions.map(function (usr) {
						var msgArray = [];
						if (usr.id != config.admin_id) { msgArray.push("You requested info on **" + usr.username + "**"); }
						else { msgArray.push("You requested info on **Bot Creator-senpai**"); }
						msgArray.push("User ID: `" + usr.id + "`");
						if (usr.game != null) { msgArray.push("Staus: `" + usr.status + "` playing `" + usr.game.name + "`"); } //broken
						else { msgArray.push("Staus: `" + usr.status + "`"); }
						var jDate = new Date(msg.channel.server.detailsOfUser(usr).joinedAt);
						msgArray.push("Joined this server on: `" + jDate.toUTCString() + "`");
						var rsO = msg.channel.server.rolesOfUser(usr.id)
						var rols = "eveyone, "
						for (rO of rsO) { rols += (rO.name + ", "); }
						msgArray.push("Roles: `" + rols.substring(0, rols.length - 2) + "`");
						if (usr.avatarURL != null) { msgArray.push("Avatar URL: `" + usr.avatarURL + "`"); }
						bot.sendMessage(msg, msgArray);
						logger.log("info", "Got info on " + usr.username);
					});
				} else {
					var msgArray = [];
					msgArray.push("You requested info on **" + msg.channel.server.name + "**");
					msgArray.push("Server ID: `" + msg.channel.server.id + "`");
					msgArray.push("Owner: `" + msg.channel.server.owner + "` (id: `" + msg.channel.server.owner.id + "`)");
					msgArray.push("Region: `" + msg.channel.server.region + "`");
					var rsO = msg.channel.server.roles;
					var rols = "everyone, ";
					for (rO of rsO) { rols += (rO.name + ", "); }
					rols = rols.replace("@", "");
					msgArray.push("Roles: `" + rols.substring(0, rols.length - 2) + "`");
					msgArray.push("Default channel: #" + msg.channel.server.defaultChannel.name + "");
					msgArray.push("This channel's id: `" + msg.channel.id + "`");
					msgArray.push("Icon URL: `" + msg.channel.server.iconURL + "`");
					bot.sendMessage(msg, msgArray);
					logger.log("info", "Got info on " + msg.channel.server.name);
				}
			} else { bot.sendMessage(msg, "Can't do that in a DM."); }
		}
	},
	"choose": {
		desc: "Makes a choice for you.",
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
		usage: "<+/->",
		process: function (bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, correctUsage("vote")); return; }
			if (votebool == false) { bot.sendMessage(msg, "There isn't a topic being voted on right now! Use `"+config.command_prefix+"newvote <topic>`"); return; }
			if (voter.indexOf(msg.author) != -1) { return; }
			voter.push(msg.author);
			var vote = suffix.split(" ")[0]
			if (vote == "+") { upvote += 1; }
			if (vote == "-") { downvote += 1; }
		}
	},
	"endvote": {
		desc: "End current vote.",
		process: function (bot, msg, suffix) {
			bot.sendMessage(msg, "**Results of last vote:**\nTopic: `" + topicstring + "`\nUpvotes: `" + upvote + " " + (upvote/(upvote+downvote))*100 + "%`\nDownvotes: `" + downvote + " " + (downvote/(upvote+downvote))*100 + "%`");
			upvote = 0;
			downvote = 0;
			voter = [];
			votebool = false;
			topicstring = "";
		}
	},
	"8ball": {
		desc: "Ask the bot a question (8ball).",
		usage: "[question]",
		process: function (bot, msg) {
			var responses = ["It is certain", "It is decidedly so", "Without a doubt", "Yes, definitely", "You may rely on it", "As I see it, yes", "Most likely", "Outlook good", "Yes", "Signs point to yes", "Ask again later", "Better not tell you now", "Cannot predict now", "Don't count on it", "My reply is no", "My sources say no", "Outlook not so good", "Very doubtful"];
			var choice = Math.floor(Math.random() * (responses.length));
			bot.sendMessage(msg, responses[choice]);
		}
	},
	"anime": {
		desc: "Gets the details on an anime from MAL.",
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
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); }
							}
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
	"manga": {
		desc: "Gets the details on an manga from MAL.",
		usage: "<manga/novel name>",
		process: function (bot, msg, suffix) {
			if (suffix) {
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/manga/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": process.env.mal_user, "pass": process.env.mal_pass, "sendImmediately": false}}, function (error, response, body) {
					if (error) { logger.log("info", error); }
					if (!error && response.statusCode == 200) {
						xml2js.parseString(body, function (err, result){
							var title = result.manga.entry[0].title;
							var english = result.manga.entry[0].english;
							var chapters = result.manga.entry[0].chapters;
							var volumes = result.manga.entry[0].volumes;
							var score = result.manga.entry[0].score;
							var type = result.manga.entry[0].type;
							var status = result.manga.entry[0].status;
							var synopsis = result.manga.entry[0].synopsis.toString();
							synopsis = synopsis.replace(/&mdash;/g, "—");
							synopsis = synopsis.replace(/&hellip;/g, "...");
							synopsis = synopsis.replace(/<br \/>/g, " ");
							synopsis = synopsis.replace(/&quot;/g, "\"");
							synopsis = synopsis.replace(/\r?\n|\r/g, " ");
							synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*");
							synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = synopsis.replace(/\[(.{1,10})\]/g, "");
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); }
							}
							bot.sendMessage(msg, "**" + title + " / " + english+"**\n**Type:** "+ type +", **Chapters:** "+chapters+", **Volumes: **"+volumes+", **Status:** "+status+", **Score:** "+score+"\n"+synopsis);
						});
					}
				});
				bot.stopTyping(msg.channel);
			} else {
				bot.sendMessage(msg, correctUsage("manga"));
			}
		}
	},
	"coinflip": {
		desc: "Flips a coin",
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
