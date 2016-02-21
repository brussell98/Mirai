var Cleverbot = require('cleverbot-node');
var Slave = new Cleverbot();
var ent = require('entities');
var colors = require('./styles.js');

exports.cleverbot = function(bot, msg) {
	var text = (msg.cleanContent.split(' ').length > 1) ? msg.cleanContent.substring(msg.cleanContent.indexOf(' ') + 1).replace('@', '') : false;
	if (text) {
		bot.startTyping(msg.channel);
		Cleverbot.prepare(() => {
			try {
				Slave.write(text, (resp) => {
					if (/\|/g.test(resp.message)) {
						resp.message = resp.message.replace(/\|/g, '\\u'); //replace | with \u
						resp.message = resp.message.replace(/\\u([\d\w]{4})/gi, (match, grp) => { //unescape unicode
							return String.fromCharCode(parseInt(grp, 16));
						});
					}
					bot.sendMessage(msg, '💬 ' + ent.decodeHTML(resp.message));
					if (!resp.message || !ent.decodeHTML(resp.message)) { Slave = new Cleverbot(); console.log(colors.cWarn(" WARN ") + "Cleverbot returned nothing"); }
				});
			} catch (error) { bot.sendMessage(msg, '⚠ There was an error', (erro, wMessage) => { bot.deleteMessage(wMessage, {'wait': 10000}); }); }
		});
		bot.stopTyping(msg.channel);
	} else { bot.sendMessage(msg, 'Yes?'); }
};
