var Cleverbot = require('cleverbot-node');
var Slave = new Cleverbot();
var ent = require('entities');
var colors = require('./styles.js');
var antiSpam = {};

setInterval(() => antiSpam = {},3600000);

exports.cleverbot = function(bot, msg) {
	var text = (msg.cleanContent.split(' ').length > 1) ? msg.cleanContent.substring(msg.cleanContent.indexOf(' ') + 1).replace('@', '') : false;
	if (text) {
		if (!antiSpam.hasOwnProperty(msg.author.id)) antiSpam[msg.author.id] = text;
		else {
			if (antiSpam[msg.author.id] == text) return;
			else antiSpam[msg.author.id] = text;
		}
		console.log(colors.cServer(msg.channel.server.name) + " > " + colors.cGreen(msg.author.username) + " > " + colors.cYellow("@" + bot.user.username) + " " + msg.cleanContent.replace("@" + bot.user.username, "").replace(" ", "").replace(/\n/g, " "));
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
					if (!resp.message || !ent.decodeHTML(resp.message)) {
						delete require.cache[require.resolve("cleverbot-node")];
						Cleverbot = require('cleverbot-node');
						Slave = new Cleverbot();
						console.log(colors.cWarn(" WARN ") + "Cleverbot returned nothing"); }
				});
			} catch (error) { bot.sendMessage(msg, '⚠ There was an error', (erro, wMessage) => { bot.deleteMessage(wMessage, {'wait': 10000}); }); }
		});
		bot.stopTyping(msg.channel);
	} else {
		if (!antiSpam.hasOwnProperty(msg.author.id)) antiSpam[msg.author.id] = "";
		else {
			if (antiSpam[msg.author.id] == "") return;
			else antiSpam[msg.author.id] = "";
		}
		console.log(colors.cServer(msg.channel.server.name) + " > " + colors.cGreen(msg.author.username) + " > " + colors.cYellow("@" + bot.user.username) + " " + msg.cleanContent.replace("@" + bot.user.username, "").replace(" ", "").replace(/\n/g, " "));
		bot.sendMessage(msg, 'Yes?');
	}
};
