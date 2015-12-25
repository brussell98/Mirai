var config = require("./config.json");
var games = require("./games.json");
var perms = require("./permissions");

/*
====================
Functions
====================
*/



/*
====================
Commands (Each one REQUIRES a desc property)
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
				msgArray.push("");
				msgArray.push("Commands: ");
				Object.keys(commands).forEach(function(cmd){
					msgArray.push("" + config.command_prefix + "" + cmd + ": " + commands[cmd].desc);
				});
				bot.sendMessage(msg.author, msgArray);
			}
			if (suffix){
				if (commands.hasOwnProperty(suffix)){
					var msgArray = [];
					Object.keys(commands).forEach(function(cmd){
						msgArray.push("" + config.command_prefix + "" + cmd + ": " + commands[cmd].desc);
						if (commands[cmd].hasOwnProperty("usage")){
							msgArray.push("Usage: `" config.command_prefix + "" + cmd + " " + commands[cmd].usage + "`");
						}
						if (commands[cmd].hasOwnProperty("permLevel")){
							msgArray.push("Permission level: " + commands[cmd].permLevel);
						}
					});
					bot.sendMessage(msg.author, msgArray);
				} else {
					bot.sendMessage(msg.author, "Command `" + suffix + "` not found.");
				}
			}
		}
	},
	"ping": {
		desc: "Replies with pong",
		permLevel: 0,
		process: function(bot, msg) {
			bot.sendMessage(msg, "pong");
		}
	}
}