var config = require("./config.json");
var games = require("./games.json").games;
var version = require("../package.json").version;
var colors = require('./styles.js');
var request = require('request');
var xml2js = require('xml2js');
var fs = require('fs');
var osuapi = require('osu-api');

//voting vars
var topicstring = "", votersUp = [], votersDown = [], upvote = 0, downvote = 0, votebool = false, voteAnMsg = {};
var lottoMax = 1, lottoMsg = {}, lottoEntries = [], lottoBool = false, lottoStarter = "";

/*
====================
Functions
====================
*/

function correctUsage(cmd) {
	var msg = "Usage: `" + config.command_prefix + "" + cmd + " " + commands[cmd].usage+"`";
	return msg;
}

function autoEndVote(bot, msg) {
	setTimeout(function() { if (votebool) { commands["vote"].process(bot, msg, "end"); } }, 180000);
}

function autoEndLotto(bot, msg) {
	setTimeout(function(){ if (lottoBool) { commands["lotto"].process(bot, msg, "end"); } }, 600000);
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
		deleteCommand: true,
		shouldDisplay: false,
		cooldown: 1,
		process: function(bot, msg, suffix) {
			var msgArray = [];
			if (!suffix){
				msgArray.push("Use `" + config.command_prefix + "help <command name>` to get info on a specific command.");
				msgArray.push("Mod can be found with `" + config.mod_command_prefix + "help [command]`.");
				msgArray.push("You can also find examples and more at __github.com/brussell98/BrussellBot/wiki/Commands__");
				msgArray.push("**Commands:**\n");
				msgArray.push("`@"+bot.user.username+" text`\n        Talk to the bot (cleverbot)");
				Object.keys(commands).forEach(function(cmd){
					if (commands[cmd].hasOwnProperty("shouldDisplay")) {
						if (commands[cmd].shouldDisplay) { msgArray.push("`" + config.command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
					} else { msgArray.push("`" + config.command_prefix + cmd + " " + commands[cmd].usage + "`\n        " + commands[cmd].desc); }
				});
				bot.sendMessage(msg.author, msgArray);
			} else {
				if (commands.hasOwnProperty(suffix)){
					msgArray.push("**" + config.command_prefix + "" + suffix + ": **" + commands[suffix].desc);
					if (commands[suffix].hasOwnProperty("usage")) { msgArray.push("**Usage:** `" + config.command_prefix + "" + suffix + " " + commands[suffix].usage + "`"); }
					if (commands[suffix].hasOwnProperty("cooldown")) { msgArray.push("**Cooldown:** " + commands[suffix].cooldown + " seconds"); }
					if (commands[suffix].hasOwnProperty("deleteCommand")) { msgArray.push("*This command will delete the message that activates it*"); }
					bot.sendMessage(msg, msgArray);
				} else { bot.sendMessage(msg, "Command `" + suffix + "` not found.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			}
		}
	},
	"botserver": {
		desc: "Get a link to the BrussellBot / Bot-chan server.",
		cooldown: 10,
		usage: "",
		process: function(bot, msg, suffix) {
			bot.sendMessage(msg, "Here's an invite to my server: **discord.gg/0kvLlwb7slG3XCCQ**");
		}
	},
	"ping": {
		desc: "Replies with pong.",
		cooldown: 2,
		shouldDisplay: false,
		usage: "",
		process: function(bot, msg) {
			var n = Math.floor(Math.random() * 4);
			if (n === 0) { bot.sendMessage(msg, "pong"); } 
			else if (n === 1) { bot.sendMessage(msg, "You thought I would say pong, didn't you?");} 
			else if (n === 2) { bot.sendMessage(msg, "pong!");} 
			else if (n === 3) { bot.sendMessage(msg, "Yeah, I'm still here");} 
		}
	},
	"joins": {
		desc: "Accepts an invite.",
		usage: "<invite link> [invite link] [-a (announce presence)]",
		deleteCommand: true,
		process: function (bot, msg, suffix) {
			if (suffix) {
				var invites = suffix.split(" ");
				for (invite of invites) {
					if (/https?:\/\/discord\.gg\/[A-Za-z0-9]+/.test(invite)) {
						var cServers = [];
						bot.servers.map(function(srvr){cServers.push(srvr.id);});
						bot.joinServer(invite, function (err, server) {
							if (err) {
								bot.sendMessage(msg, ":warning: Failed to join: " + err);
								console.log(colors.cWarn(" WARN ")+err);
							} else if (!server || server.name == undefined || server.roles == undefined || server.channels == undefined || server.members == undefined) {
								console.log(colors.cWarn(" WARN ")+"Error joining server. Didn't receive all data.");
								bot.sendMessage(msg, ":warning: Failed to receive all data, please try again in a few seconds.");
								try {
									bot.leaveServer(server);
								} catch(error) { /*how did it get here?*/ }
							} else if (cServers.indexOf(server.id) > -1) {
								console.log("Already in server");
								bot.sendMessage(msg, "I'm already in that server!");
							} else {
								console.log(colors.cGreen("Joined server: ")+server.name);
								bot.sendMessage(msg, ":white_check_mark: Successfully joined ***" + server.name + "***");
								if (suffix.indexOf("-a") != -1) {
									setTimeout(function(){
										var msgArray = [];
										msgArray.push("Hi! I'm **" + bot.user.username + "** and I was invited to this server by " + msg.author + ".");
										msgArray.push("You can use `" + config.command_prefix + "help` to see what I can do. Mods can use `"+config.mod_command_prefix+"help` for mod commands.");
										msgArray.push("If I shouldn't be here someone with the `Kick Members` permission can use `" + config.mod_command_prefix + "leaves` to make me leave");
										msgArray.push("For help / feedback / bugs/ testing / info / changelogs / etc. go to **discord.gg/0kvLlwb7slG3XCCQ**");
										bot.sendMessage(server.defaultChannel, msgArray);
									}, 2000);
								} else { setTimeout(function(){ bot.sendMessage(server.defaultChannel, "*Quietly walks in*"); }, 2000); }
							}
						});
					}
				}
			} else { bot.sendMessage(msg, correctUsage("joins")); }
		}
	},
	"about": {
		desc: "About me",
		deleteCommand: true,
		cooldown: 10,
		usage: "",
		process: function(bot, msg, suffix) {
			var msgArray = [];
			msgArray.push("I'm " + bot.user.username + " and I was made by brussell98.");
			msgArray.push("I run on the unofficial Discord API `Discord.js`");
			msgArray.push("My website is **brussell98.github.io/BrussellBot/**");
			bot.sendMessage(msg, msgArray);
		}
	},
	"letsplay": {
		desc: "Ask if anyone wants to play a game. (@ everyone if members <= 30)",
		deleteCommand: true,
		usage: "[game name]",
		cooldown: 15,
		process: function(bot, msg, suffix) {
			if (!msg.channel.isPrivate && msg.channel.permissionsOf(msg.author).hasPermission("mentionEveryone") && msg.channel.server.members.length <= 30) {
				if (suffix) { bot.sendMessage(msg, ":video_game: @everyone, " + msg.author + " would like to know if anyone wants to play **" + suffix + "**."); }
				else { bot.sendMessage(msg, ":video_game: @everyone, " + msg.author + " would like to know if anyone wants to play a game"); }
			} else {
				if (suffix) { bot.sendMessage(msg, ":video_game: " + msg.author + " would like to know if anyone wants to play **" + suffix + "**."); }
				else { bot.sendMessage(msg, ":video_game: " + msg.author + " would like to know if anyone wants to play a game"); }
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
			request('https://rolz.org/api/?' + dice + '.json', function(err, response, body) {
				if (!err && response.statusCode == 200) {
					var roll = JSON.parse(body);
					if (roll.details.length <= 100) { bot.sendMessage(msg, ":game_die: Your " + roll.input + " resulted in " + roll.result + " " + roll.details); }
					else { bot.sendMessage(msg, ":game_die: Your " + roll.input + " resulted in " + roll.result); }
				} else { console.log(colors.cWarn(" WARN ")+"Got an error: ", error, ", status code: ", response.statusCode); }
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
			} catch(err) { console.log(colors.cError(" ERROR ")+err); bot.sendMessage(msg, ":warning: Error parsing suffix into int", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			bot.sendMessage(msg, msg.author.username + " rolled 1-" + roll + " and got " + Math.floor((Math.random() * (roll)) + 1));
		}
	},
	"info": {
		desc: "Gets info on the server or a user if mentioned.",
		usage: "[@username]",
		deleteCommand: true,
		cooldown: 10,
		process: function (bot, msg, suffix) {
			if (!msg.channel.isPrivate) {
				if (suffix) {
					if (msg.mentions.length == 0) { bot.sendMessage(msg, correctUsage("info"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					msg.mentions.map(function (usr) {
						var msgArray = [];
						if (usr.id != config.admin_id) { msgArray.push(":information_source: You requested info on **" + usr.username + "**"); }
						else { msgArray.push(":information_source: You requested info on **Bot Creator-senpai**"); }
						msgArray.push("**User ID:** `" + usr.id + "`");
						if (usr.game != null) { msgArray.push("Status: `" + usr.status + "` playing `" + usr.game.name + "`"); }
						else { msgArray.push("**Status:** `" + usr.status + "`"); }
						var jDate = new Date(msg.channel.server.detailsOfUser(usr).joinedAt);
						msgArray.push("**Joined this server on:** `" + jDate.toUTCString() + "`");
						var rsO = msg.channel.server.rolesOfUser(usr.id)
						var rols = "everyone, "
						for (rO of rsO) { rols += (rO.name + ", "); }
						rols = rols.replace("@", "");
						msgArray.push("**Roles:** `" + rols.substring(0, rols.length - 2) + "`");
						if (usr.avatarURL != null) { msgArray.push("**Avatar URL:** `" + usr.avatarURL + "`"); }
						bot.sendMessage(msg, msgArray);
						if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Got info on " + usr.username); }
					});
				} else {
					var msgArray = [];
					msgArray.push(":information_source: You requested info on **" + msg.channel.server.name + "**");
					msgArray.push("**Server ID:** `" + msg.channel.server.id + "`");
					msgArray.push("**Owner:** `" + msg.channel.server.owner.username + "` (**id:** `" + msg.channel.server.owner.id + "`)");
					msgArray.push("**Region:** `" + msg.channel.server.region + "`");
					msgArray.push("**Members:** `" + msg.channel.server.members.length + "`");
					var rsO = msg.channel.server.roles;
					var rols = "everyone, ";
					for (rO of rsO) { rols += (rO.name + ", "); }
					rols = rols.replace("@", "");
					msgArray.push("**Roles:** `" + rols.substring(0, rols.length - 2) + "`");
					msgArray.push("**Default channel:** #" + msg.channel.server.defaultChannel.name + "");
					msgArray.push("**This channel's id:** `" + msg.channel.id + "`");
					msgArray.push("**Icon URL:** `" + msg.channel.server.iconURL + "`");
					bot.sendMessage(msg, msgArray);
					if (config.debug) { console.log(colors.cDebug(" DEBUG ")+"Got info on " + msg.channel.server.name); }
				}
			} else { bot.sendMessage(msg, ":warning: Can't do that in a DM.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"avatar": {
		desc: "Get a link to a user's avatar (must use @mention).",
		usage: "<@mention>",
		deleteCommand: true,
		cooldown: 6,
		process: function(bot, msg, suffix) {
			if (msg.mentions.length == 0) { (msg.author.avatarURL != null) ? bot.sendMessage(msg, msg.author.username+"'s avatar is: "+msg.author.avatarURL+"") : bot.sendMessage(msg, msg.author.username+" has no avatar", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
			else { msg.mentions.map(function(usr) {
				(usr.avatarURL != null) ? bot.sendMessage(msg, usr.username+"'s avatar is: "+usr.avatarURL+"") : bot.sendMessage(msg, "User has no avatar", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			});}
		}
	},
	"choose": {
		desc: "Makes a choice for you.",
		usage: "<option 1>, <option 2>, [option], [option]",
		cooldown: 4,
		process: function (bot, msg, suffix) {
			if (!suffix || /(.*), ?(.*)/.test(suffix) == false) { bot.sendMessage(msg, correctUsage("choose"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			var choices = suffix.split(/, ?/);
			if (choices.length < 2) {
				bot.sendMessage(msg, correctUsage("choose"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); });
			} else {
				choice = Math.floor(Math.random() * (choices.length));
				bot.sendMessage(msg, "I picked " + choices[choice]);
			}
		}
	},
	"lotto": {
		desc: "Lottery picks a random entered user.",
		usage: "end | enter | new [max entries] [-noautoend] | <mentions to pick from> (pick from the users mentioned)",
		deleteCommand: true,
		cooldown: 5,
		process: function (bot, msg, suffix) {
			if (suffix.split(" ")[0].replace(" ", "") == "new") {
				if (lottoBool) { bot.sendMessage(msg, "Lottery already running, please wait for it to end."), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }; return; }
				else { 
					if (suffix.split(" ").length > 1) {
						if (/^\d+$/.test(suffix.substring(4).replace(" -noautoend", ""))) { lottoMax = parseInt(suffix.substring(4)); }
					}
					lottoBool = true;
					bot.sendMessage(msg, msg.author.username+" started a lottery! Use `"+config.command_prefix+"lotto enter` to enter. (Max entries: "+lottoMax+")", function (e, message) { lottoMsg = message; }); 
					lottoStarter = msg.author.id;
					if (suffix.indexOf("-noautoend") == -1) { autoEndLotto(bot, msg); }
				}
			} else if (suffix.replace(" ", "") == "end") {
				if (!lottoBool) { bot.sendMessage(msg, "There isn't a lottery running.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				else if (msg.channel.id != lottoMsg.channel.id) { bot.sendMessage(msg, "You can only end the lottery from the channel it's running in.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				else if (msg.author.id != lottoStarter) { bot.sendMessage(msg, "You didn't start this lottery!", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				else {
					if (lottoEntries.length < 2) { bot.sendMessage(msg, "Less than 2 people entered the lottery."); }
					else {
						var choice = Math.floor(Math.random() * lottoEntries.length);
						bot.sendMessage(lottoMsg.channel, "Out of "+lottoEntries.length+" entries the winner is "+lottoEntries[choice]);
					}
					lottoMax = 1; lottoMsg = {}; lottoEntries = []; lottoBool = false, lottoStarter = "";
				}
			} else if (suffix.replace(" ", "") == "enter") {
				if (!lottoBool) { bot.sendMessage(msg, "No lottery to enter!", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				else if (msg.channel.id != lottoMsg.channel.id) { bot.sendMessage(msg, "You must enter the lottery in the channel it is running in.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				else {
					if (lottoEntries.indexOf(msg.author) == -1) { lottoEntries.push(msg.author); bot.sendMessage(msg, "Entered "+msg.author.username+" into the lottery"); return; }
					else {
						if (lottoMax == 1) { bot.sendMessage(msg, "You've entered the max number of times "+msg.author.username+".", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
						else if (lottoEntries.filter(function(value){return value == msg.author;}).length < lottoMax) { lottoEntries.push(msg.author); bot.sendMessage(msg, "Entered "+msg.author.username+" into the lottery"); }; return; }
						else { bot.sendMessage(msg, msg.author.username+" you've already entered the maximum amount of times!", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 6000}); }); return; }
					}
				}
			} else if (msg.mentions.length > 0) {
				if (msg.mentions.length < 2) { bot.sendMessage(msg, "You need to enter multiple users!"); return; }
				var choice = Math.floor(Math.random() * msg.mentions.length);
				bot.sendMessage(msg, "Out of "+msg.mentions.length+" entries the winner is "+msg.mentions[choice]);
			} else { bot.sendMessage(msg, correctUsage("lotto"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); }
		}
	},
	"vote": {
		desc: "Start / end a vote, or vote on one.",
		usage: "+/- | new <topic> | end",
		deleteCommand: true,
		cooldown: 4,
		process: function (bot, msg, suffix) {
			if (suffix.split(" ")[0] == "new") {
				if (votebool == true) { bot.sendMessage(msg, ":warning: Theres already a vote pending!", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (suffix.length > 4) { topicstring = suffix.substring(4); } else { topicstring = "None"; }
				bot.sendMessage(msg, "New Vote started: `" + topicstring + "`. To vote say `" + config.command_prefix + "vote +/-`\nIf the vote isn't ended manually it will end after 3 minutes\nUpvotes: 0\nDownvotes: 0", function (err, message) { voteAnMsg = message; });
				votebool = true;
				autoEndVote(bot, msg);
			} else if (suffix.replace(" ", "") == "end") {
				if (votebool == false) { bot.sendMessage(msg, "There isn't a vote to end.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				if (msg.channel.id == voteAnMsg.channel.id && bot.channels.get("id", voteAnMsg.channel.id) !== null) {
					bot.sendMessage(voteAnMsg.channel, "**Results of last vote:**\nTopic: `" + topicstring + "`\nUpvotes: `" + upvote + " " + Math.round((upvote/(upvote+downvote))*100) + "%`\nDownvotes: `" + downvote + " " + Math.round((downvote/(upvote+downvote))*100) + "%`");
					bot.deleteMessage(voteAnMsg);
				} else { bot.sendMessage(msg, ":warning: Must be done in the channel the vote was created in.", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			upvote = 0; downvote = 0; votersUp = []; votersDown = []; votebool = false; topicstring = ""; voteAnMsg = {};
			} else if (suffix.replace(" ", "") == "+" || suffix.replace(" ", "") == "-") {
				if (votebool == false) { bot.sendMessage(msg, ":warning: There isn't a topic being voted on right now! Use `"+config.command_prefix+"newvote <topic>`", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (msg.channel.id != voteAnMsg.channel.id) { bot.sendMessage(msg, ":warning: You must vote in the channel where the vote was started", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				if (suffix.indexOf("+") > -1) {
					if (votersUp.indexOf(msg.author) > -1) { return; }
					if (votersDown.indexOf(msg.author) > -1) {
						downvote -= 1; upvote += 1;
						var i = votersDown.indexOf(msg.author);
						delete votersDown[i]; votersUp.push(msg.author);
						bot.updateMessage(voteAnMsg, voteAnMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: "+upvote+"\nDownvotes: "+downvote), function (err, message) { voteAnMsg = message; });
					} else {
						upvote += 1;
						votersUp.push(msg.author);
						bot.updateMessage(voteAnMsg, voteAnMsg.content.replace(/Upvotes\: [\d]{1,2}/g, "Upvotes: "+upvote), function (err, message) { voteAnMsg = message; });
					}
				} else if (suffix.indexOf("-") > -1) {
					if (votersDown.indexOf(msg.author) > -1) { return; }
					if (votersUp.indexOf(msg.author) > -1) {
						downvote += 1; upvote -= 1;
						var i = votersUp.indexOf(msg.author);
						delete votersUp[i]; votersDown.push(msg.author);
						bot.updateMessage(voteAnMsg, voteAnMsg.content.replace(/Upvotes\: [\d]{1,2}\nDownvotes: [\d]{1,2}/g, "Upvotes: "+upvote+"\nDownvotes: "+downvote), function (err, message) { voteAnMsg = message; });
					} else {
						downvote += 1;
						votersDown.push(msg.author);
						bot.updateMessage(voteAnMsg, voteAnMsg.content.replace(/Downvotes\: [\d]{1,2}/g, "Downvotes: "+downvote), function (err, message) { voteAnMsg = message; });
					}
				}
			} else { bot.sendMessage(msg, correctUsage("vote"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 12000}); }); return; }
		}
	},
	"strawpoll": {
		desc: "Create a strawpoll",
		deleteCommand: true,
		usage: "<option1>, <option2>, [option3], ...",
		cooldown: 15,
		process: function(bot, msg, suffix) {
			if (suffix && /^[^, ](.*), ?(.*)[^, ]$/.test(suffix)) {
				suffix = suffix.split(/, ?/);
				request.post(
				    {
				    	"url": 'https://strawpoll.me/api/v2/polls', 
				    	"headers": {"content-type": "application/json"}, 
				    	"json": true, 
				    	body: {
				    		"title": ""+msg.author.username+"'s Poll",
				    		"options": suffix
				    	}
				    },
				    function (error, response, body) {
				        if (!error && response.statusCode == 201) {
				            bot.sendMessage(msg, msg.author.username + " created a strawpoll. Vote here: http://strawpoll.me/" + body.id);
				        } else if (error) { bot.sendMessage(msg, error); }
				        else if (response.statusCode != 201) { bot.sendMessage(msg, "Got status code "+response.statusCode); }
				    }
				);
			} else { bot.sendMessage(msg, correctUsage("strawpoll"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"8ball": {
		desc: "It's an 8ball...",
		usage: "[question]",
		cooldown: 4,
		process: function (bot, msg) {
			var responses = ["It is certain", "It is decidedly so", "Without a doubt", "Yes, definitely", "You may rely on it", "As I see it, yes", "Most likely", "Outlook good", "Yes", "Signs point to yes", "Better not tell you now", "Don't count on it", "My reply is no", "My sources say no", "Outlook not so good", "Very doubtful"];
			var choice = Math.floor(Math.random() * (responses.length));
			bot.sendMessage(msg, ":8ball: "+responses[choice]);
		}
	},
	"anime": {
		desc: "Gets details on an anime from MAL.",
		usage: "<anime name>",
		deleteCommand: true,
		cooldown: 6,
		process: function (bot, msg, suffix) {
			if (suffix) {
				if (config.is_heroku_version) { var USER = process.env.mal_user; } else { var USER = config.mal_user; }
				if (config.is_heroku_version) { var PASS = process.env.mal_pass; } else { var PASS = config.mal_pass; }
				if (!USER || !PASS) { bot.sendMessage(msg, "MAL login not configured by bot owner", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/anime/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": USER, "pass": PASS, "sendImmediately": false}}, function (error, response, body) {
					if (error) { console.log(error); }
					if (!error && response.statusCode == 200) {
						xml2js.parseString(body, function (err, result){
							var title = result.anime.entry[0].title;
							var english = result.anime.entry[0].english;
							var ep = result.anime.entry[0].episodes;
							var score = result.anime.entry[0].score;
							var type = result.anime.entry[0].type;
							var status = result.anime.entry[0].status;
							var synopsis = result.anime.entry[0].synopsis.toString();
							synopsis = synopsis.replace(/&mdash;/g, "—"); synopsis = synopsis.replace(/&copy;/g, "©");
							synopsis = synopsis.replace(/&hellip;/g, "..."); synopsis = synopsis.replace(/<br \/>/g, " ");
							synopsis = synopsis.replace(/&quot;/g, "\""); synopsis = synopsis.replace(/\r?\n|\r/g, " ");
							synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*"); synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = synopsis.replace(/\[(.{1,10})\]/g, ""); synopsis = synopsis.replace(/&amp;/g, "&");
							synopsis = synopsis.replace(/&#039;/g, "'");
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); synopsis += "..."; }
							}
						bot.sendMessage(msg, "**" + title + " / " + english+"**\n**Type:** "+ type +" **| Episodes:** "+ep+" **| Status:** "+status+" **| Score:** "+score+"\n"+synopsis);
						});
					} else { bot.sendMessage(msg, "\""+suffix+"\" not found", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				});
				bot.stopTyping(msg.channel);
			} else { bot.sendMessage(msg, correctUsage("anime"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"manga": {
		desc: "Gets details on a manga from MAL.",
		usage: "<manga/novel name>",
		deleteCommand: true,
		cooldown: 6,
		process: function (bot, msg, suffix) {
			if (suffix) {
				if (config.is_heroku_version) { var USER = process.env.mal_user; } else { var USER = config.mal_user; }
				if (config.is_heroku_version) { var PASS = process.env.mal_pass; } else { var PASS = config.mal_pass; }
				if (!USER || !PASS) { bot.sendMessage(msg, "MAL login not configured by bot owner", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				bot.startTyping(msg.channel);
				var tags = suffix.split(" ").join("+");
				var rUrl = "http://myanimelist.net/api/manga/search.xml?q=" + tags;
				request(rUrl, {"auth": {"user": USER, "pass": PASS, "sendImmediately": false}}, function (error, response, body) {
					if (error) { console.log(error); }
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
							synopsis = synopsis.replace(/&mdash;/g, "—"); synopsis = synopsis.replace(/&copy;/g, "©");
							synopsis = synopsis.replace(/&hellip;/g, "..."); synopsis = synopsis.replace(/<br \/>/g, " ");
							synopsis = synopsis.replace(/&quot;/g, "\""); synopsis = synopsis.replace(/\r?\n|\r/g, " ");
							synopsis = synopsis.replace(/\[(i|\/i)\]/g, "*"); synopsis = synopsis.replace(/\[(b|\/b)\]/g, "**");
							synopsis = synopsis.replace(/\[(.{1,10})\]/g, ""); synopsis = synopsis.replace(/&amp;/g, "&");
							synopsis = synopsis.replace(/&#039;/g, "'");
							if (!msg.channel.isPrivate) {
								if (synopsis.length > 400) { synopsis = synopsis.substring(0, 400); }
							}
							bot.sendMessage(msg, "**" + title + " / " + english+"**\n**Type:** "+ type +" **| Chapters:** "+chapters+" **| Volumes: **"+volumes+" **| Status:** "+status+" **| Score:** "+score+"\n"+synopsis);
						});
					} else { bot.sendMessage(msg, "\""+suffix+"\" not found", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				});
				bot.stopTyping(msg.channel);
			} else { bot.sendMessage(msg, correctUsage("manga"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		}
	},
	"coinflip": {
		desc: "Flip a coin",
		usage: "",
		deleteCommand: true,
		cooldown: 2,
		process: function(bot, msg, suffix) {
			var side = Math.floor(Math.random() * (2));
			if (side == 0) { bot.sendMessage(msg, msg.author.username+" flipped a coin and got Heads"); }
			else { bot.sendMessage(msg, msg.author.username+" flipped a coin and got Tails"); }
		}
	},
	"osu": {
		desc: "Osu! commands. Use "+config.command_prefix+"help osu",
		usage: "sig [username] [hex] | best [username] | user [username] | recent [username]",
		deleteCommand: true,
		cooldown: 5,
		process: function(bot, msg, suffix) {
			if (suffix) {
			if (suffix.split(" ")[0] === "sig") {

				var color = "ff66aa",
					username = msg.author.username;
				suffix = suffix.split(" ");
				if (suffix.length >= 2) {
					if (/sig (.*) #?[A-Fa-f0-9]{6}$/.test(suffix.join(" "))){
						var username = suffix.join("%20").substring(6, suffix.join("%20").lastIndexOf("%20"));
						if (suffix[suffix.length - 1].length == 6) { color = suffix[suffix.length - 1]; }
						if (suffix[suffix.length - 1].length == 7) { color = suffix[suffix.length - 1].substring(1); }
					} else if (/sig #?[A-Fa-f0-9]{6}$/.test(suffix.join(" "))) {
						var username = msg.author.username;
						if (suffix[1].length == 6) { color = suffix[1]; }
						if (suffix[1].length == 7) { color = suffix[1].substring(1); }
					}
				}
				request({url: 'https://lemmmy.pw/osusig/sig.php?colour=hex'+color+'&uname='+username+'&pp=2&flagshadow&xpbar&xpbarhex&darktriangles', encoding: null}, function(err, response, body){
					if (err) { bot.sendMessage(msg, ":warning: Error: "+err, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
					else if (response.statusCode != 200) { bot.sendMessage(msg, ":warning: Got status code "+response.statusCode, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
					else { bot.sendMessage(msg, "Here's your osu signature "+msg.author.username+"! Get a live version at `lemmmy.pw/osusig/`");
					bot.sendFile(msg, body, 'sig.png'); }
				});

			} else if (suffix.split(" ")[0] == "user") {

				if (suffix.split(" ").length < 2) { var username = msg.author.username; }
				else { var username = suffix.substring(5); }
				if (config.is_heroku_version) { var APIKEY = process.env.osu_api_key; } else { var APIKEY = config.osu_api_key; }
				if (!APIKEY) { bot.sendMessage(msg, "Osu API key not configured by bot owner", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(APIKEY);
				osu.getUser(username, function(err, data){
					if (err) { bot.sendMessage(msg, ":warning: Error: "+err, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data) { bot.sendMessage(msg, ":warning: User not found", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					try {
						var msgArray = [];
						msgArray.push("Osu stats for: **"+data.username+"**:");
						msgArray.push("----------------------------------");
						msgArray.push("**Play Count**: "+data.playcount.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" | **Ranked Score**: "+data.ranked_score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" | **Total Score**: "+data.total_score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" | **Level**: "+data.level.substring(0, data.level.split(".")[0].length+3));
						msgArray.push("**PP**: "+data.pp_raw.split(".")[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" | **Rank**: #"+data.pp_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" | **Country Rank**: #"+data.pp_country_rank.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" | **Accuracy**: "+data.accuracy.substring(0, data.accuracy.split(".")[0].length+3)+"%");
						msgArray.push("**300**: "+data.count300.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" | **100**: "+data.count100.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" | **50**: "+data.count50.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" | **SS**: "+data.count_rank_ss+" | **S**: "+data.count_rank_s+" | **A**: "+data.count_rank_a.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
						bot.sendMessage(msg, msgArray);
					} catch(error) { bot.sendMessage(msg, "Error: "+error, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				});

			} else if (suffix.split(" ")[0] === "best") {

				if (suffix.split(" ").length < 2) { var username = msg.author.username; }
				else { var username = suffix.substring(5); }
				if (config.is_heroku_version) { var APIKEY = process.env.osu_api_key; } else { var APIKEY = config.osu_api_key; }
				if (!APIKEY) { bot.sendMessage(msg, "Osu API key not configured by bot owner", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(APIKEY);
				osu.getUserBest(username, function (err, data) {
					if (err) { bot.sendMessage(msg, ":warning: Error: "+err, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0] || !data[1] || !data[2] || !data[3] || !data[4]) { bot.sendMessage(msg, ":warning: User not found or user doesn't have 5 plays", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					try {
						var msgArray = [];
						msgArray.push("Top 5 osu scores for: **"+username+"**:");
						msgArray.push("----------------------------------");
						osu.getBeatmap(data[0].beatmap_id, function (err, map1) {
							msgArray.push("**1.** *"+map1.title+"* *(☆"+map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length+3)+")*: **PP:** "+Math.round(data[0].pp.split(".")[0])+" **| Score:** "+data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[0].countmiss+" **| Date:** "+data[0].date);
							osu.getBeatmap(data[1].beatmap_id, function (err, map2) {
								msgArray.push("**2.** *"+map2.title+"* *(☆"+map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length+3)+")*: **PP:** "+Math.round(data[1].pp.split(".")[0])+" **| Score:** "+data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[1].countmiss+" **| Date:** "+data[1].date);
								osu.getBeatmap(data[2].beatmap_id, function (err, map3) {
									msgArray.push("**3.** *"+map3.title+"* *(☆"+map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length+3)+")*: **PP:** "+Math.round(data[2].pp.split(".")[0])+" **| Score:** "+data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[2].countmiss+" **| Date:** "+data[2].date);
									osu.getBeatmap(data[3].beatmap_id, function (err, map4) {
										msgArray.push("**4.** *"+map4.title+"* *(☆"+map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length+3)+")*: **PP:** "+Math.round(data[3].pp.split(".")[0])+" **| Score:** "+data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[3].countmiss+" **| Date:** "+data[3].date);
										osu.getBeatmap(data[4].beatmap_id, function (err, map5) {
											msgArray.push("**5.** *"+map5.title+"* *(☆"+map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length+3)+")*: **PP:** "+Math.round(data[4].pp.split(".")[0])+" **| Score:** "+data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[4].countmiss+" **| Date:** "+data[4].date);
											bot.sendMessage(msg, msgArray);
						});});});});});
					} catch(error) { bot.sendMessage(msg, "Error: "+error, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
				});

			} else if (suffix.split(" ")[0] === "recent") {

				if (suffix.split(" ").length < 2) { var username = msg.author.username; }
				else { var username = suffix.substring(7); }
				if (config.is_heroku_version) { var APIKEY = process.env.osu_api_key; } else { var APIKEY = config.osu_api_key; }
				if (!APIKEY) { bot.sendMessage(msg, "Osu API key not configured by bot owner", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
				var osu = new osuapi.Api(APIKEY);
				osu.getUserRecent(username, function (err, data) {
					if (err) { bot.sendMessage(msg, ":warning: Error: "+err, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					if (!data || !data[0]) { bot.sendMessage(msg, ":warning: User not found or no recent plays", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
					var msgArray = [];
					msgArray.push("5 most recent plays for: **"+username+"**:");
					msgArray.push("----------------------------------");
					osu.getBeatmap(data[0].beatmap_id, function (err, map1) {
						msgArray.push("**1.** *"+map1.title+"* *(☆"+map1.difficultyrating.substring(0, map1.difficultyrating.split(".")[0].length+3)+")*: **Score:** "+data[0].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[0].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[0].countmiss);
						if (!data[1]) { bot.sendMessage(msg, msgArray); return; }
						osu.getBeatmap(data[1].beatmap_id, function (err, map2) {
							msgArray.push("**2.** *"+map2.title+"* *(☆"+map2.difficultyrating.substring(0, map2.difficultyrating.split(".")[0].length+3)+")*: **Score:** "+data[1].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[1].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[1].countmiss);
							if (!data[2]) { bot.sendMessage(msg, msgArray); return; }
							osu.getBeatmap(data[2].beatmap_id, function (err, map3) {
								msgArray.push("**3.** *"+map3.title+"* *(☆"+map3.difficultyrating.substring(0, map3.difficultyrating.split(".")[0].length+3)+")*: **Score:** "+data[2].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[2].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[2].countmiss);
								if (!data[3]) { bot.sendMessage(msg, msgArray); return; }
								osu.getBeatmap(data[3].beatmap_id, function (err, map4) {
									msgArray.push("**4.** *"+map4.title+"* *(☆"+map4.difficultyrating.substring(0, map4.difficultyrating.split(".")[0].length+3)+")*: **Score:** "+data[3].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[3].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[3].countmiss);
									if (!data[4]) { bot.sendMessage(msg, msgArray); return; }
									osu.getBeatmap(data[4].beatmap_id, function (err, map5) {
										msgArray.push("**5.** *"+map5.title+"* *(☆"+map5.difficultyrating.substring(0, map5.difficultyrating.split(".")[0].length+3)+")*: **Score:** "+data[4].score.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Max Combo:** "+data[4].maxcombo.replace(/\B(?=(\d{3})+(?!\d))/g, ",")+" **| Misses:** "+data[4].countmiss);
										bot.sendMessage(msg, msgArray);
					});});});});});
				});

			} else { bot.sendMessage(msg, correctUsage("osu"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); }
			} else { bot.sendMessage(msg, correctUsage("osu"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 15000}); }); }
		}
	},
	"rps": {
		desc: "Play Rock Paper Scissors",
		usage: "<rock/paper/scissors>",
		cooldown: 2,
		process: function(bot, msg, suffix) {
			//if (!suffix) { bot.sendMessage(msg, correctUsage("rps")); return; }
			var choice = Math.floor(Math.random() * 3);
			if (choice == 0) { bot.sendMessage(msg, "I picked rock"); }
			else if (choice == 1) { bot.sendMessage(msg, "I picked paper"); }
			else if (choice == 2) { bot.sendMessage(msg, "I picked scissors"); }
		}
	},
	"weather": {
		desc: "Get the weather",
		usage: "<City/City,Us> or <zip/zip,us>     example: ]weather 12345,us",
		deleteCommand: true,
		cooldown: 7,
		process: function(bot, msg, suffix) {
			if (config.is_heroku_version) { var APIKEY = process.env.weather_api_key; } else { var APIKEY = config.weather_api_key; }
			if (APIKEY == null || APIKEY == "") { bot.sendMessage(msg, ":warning: No API key defined by bot owner", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (suffix) { suffix = suffix.replace(" ", ""); }
			if (!suffix) { bot.sendMessage(msg, correctUsage("weather"), function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); return; }
			if (/\d/.test(suffix) == false) { var rURL = "http://api.openweathermap.org/data/2.5/weather?q="+suffix+"&APPID="+APIKEY; }
			else { var rURL = "http://api.openweathermap.org/data/2.5/weather?zip="+suffix+"&APPID="+APIKEY; }
			request(rURL, function(error, response, body){
				if (!error && response.statusCode == 200) {
					body = JSON.parse(body);
					if (!body.hasOwnProperty("weather")) { return; }
					if (body.sys.country == "US") { var temp = Math.round(parseInt(body.main.temp)*(9/5)-459.67) + " °F"; }
					else { var temp = Math.round(parseInt(body.main.temp)-273.15) + " °C"; }
					if (body.sys.country == "US") { var windspeed = Math.round(parseInt(body.wind.speed)*2.23694) + " mph"; }
					else { var windspeed = body.wind.speed + " m/s"; }
					var emoji = ":sunny:";
					if (body.weather[0].description.indexOf("cloud") > -1) { emoji = ":cloud:"; }
					if (body.weather[0].description.indexOf("snow") > -1) { emoji = ":snowflake:"; }
					if (body.weather[0].description.indexOf("rain") > -1 || body.weather[0].description.indexOf("storm") > -1 || body.weather[0].description.indexOf("drizzle") > -1) { emoji = ":umbrella:"; }
					bot.sendMessage(msg, emoji+" Weather for **"+body.name+"**:\n**Conditions:** "+body.weather[0].description+" **Temp:** "+temp+"\n**Humidity:** "+body.main.humidity+"% **Wind:** "+windspeed+" **Cloudiness:** "+body.clouds.all+"%");
				} else { console.log(error); }
			});
		}
	},
	"google": {
		desc: "Let me Google that for you",
		deleteCommand: true,
		usage: "<search>",
		cooldown: 4,
		process: function(bot, msg, suffix) {
			if (!suffix) { bot.sendMessage(msg, "**http://www.lmgtfy.com/?q=brussellbot+commands**"); return; }
			suffix = suffix.split(" ");
			for (var i = 0; i < suffix.length; i++) { suffix[i] = encodeURIComponent(suffix[i]); }
			bot.sendMessage(msg, ":mag: **http://www.lmgtfy.com/?q="+suffix.join("+")+"**");
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
			request('http://numbersapi.com/'+number+'/trivia?json', function (error, response, body) {
				if (error) { bot.sendMessage(msg, "Error: "+error, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
				if (response.statusCode != 200) { bot.sendMessage(msg, "Got status code "+response.statusCode, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
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
		process: function (bot, msg, suffix) {
			request('http://catfacts-api.appspot.com/api/facts', function (error, response, body) {
				if (error) { bot.sendMessage(msg, "Error: "+error, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
				if (response.statusCode != 200) { bot.sendMessage(msg, "Got status code "+response.statusCode, function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 10000}); }); }
				if (!error && response.statusCode == 200) {
					body = JSON.parse(body);
					bot.sendMessage(msg, msg.author.username+", did you know that "+body.facts[0]);
				}
			});
		}
	}
};

exports.commands = commands;
