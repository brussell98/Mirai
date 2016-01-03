var Cleverbot = require('cleverbot-node');
var Slave = new Cleverbot();

exports.cleverbot = function(bot, msg) {
	var mention = msg.content.split(" ")[0];
	var suffix = msg.content.substring(mention.length + 2);
	if (suffix) {
		Cleverbot.prepare(function() {
			bot.startTyping(msg.channel);
			Slave.write(suffix, function(resp) {
				bot.sendMessage(msg, resp.message);
				bot.stopTyping(msg.channel);
			});
		});
	} else { bot.sendMessage(msg, "What is it?"); }
}