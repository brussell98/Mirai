var Cleverbot = require('cleverbot-node');
var Slave = new Cleverbot();

exports.cleverbot = function(bot, msg) {
	var mention = msg.content.split(" ")[0];
	var suffix = msg.content.substring(mention.length + 2).match(/[a-zA-Z0-9 ',:.?!\(\)-]+/g); //delete bad characters
	if (suffix) {
		bot.startTyping(msg.channel);
		suffix = suffix.join(); //put it back together after spliting it
		Cleverbot.prepare(function() {
			Slave.write(suffix, function(resp) {
				if (/\|/g.test(resp.message)) {
					resp.message = resp.message.replace(/\|/g, "\\u"); //replace | with \u
					resp.message = resp.message.replace(/\\u([\d\w]{4})/gi, function (match, grp) { //unescape unicode
					    return String.fromCharCode(parseInt(grp, 16));
					});
				}
				bot.sendMessage(msg, ":speech_balloon: "+resp.message);
			});
		});
		bot.stopTyping(msg.channel);
	} else { bot.sendMessage(msg, "What is it?"); } //if no suffix
};
