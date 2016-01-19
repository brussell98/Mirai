var Cleverbot = require('cleverbot-node');
var Slave = new Cleverbot();

exports.cleverbot = function(bot, msg) {
	var text = msg.content.substring(22);
	if (text){
		bot.startTyping(msg.channel);
		for (var i = 0; i < msg.mentions.length; i++){
			if (msg.mentions[i].id != bot.user.id) { text = text.replace("<@"+msg.mentions[i].id+">", msg.mentions[i].username); }
		}
		Cleverbot.prepare(function() {
			try {
				Slave.write(text, function(resp) {
					if (/\|/g.test(resp.message)) {
						resp.message = resp.message.replace(/\|/g, "\\u"); //replace | with \u
						resp.message = resp.message.replace(/\\u([\d\w]{4})/gi, function (match, grp) { //unescape unicode
						    return String.fromCharCode(parseInt(grp, 16));
						});
					}
					bot.sendMessage(msg, ":speech_balloon: "+resp.message);
				});
			} catch(error) { bot.sendMessage(msg, ":warning: There was an error", function (erro, wMessage) { bot.deleteMessage(wMessage, {"wait": 8000}); }); }
		});
		bot.stopTyping(msg.channel);
	} else { bot.sendMessage(msg, "What is it?"); } //if no suffix
};
