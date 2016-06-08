let Cleverbot = require('cleverbot-node'),
	Waifu = new Cleverbot(),
	ent = require('entities'),
	antiSpam = {};

setInterval(() => antiSpam = {}, 3600000);

exports.cleverbot = function(bot, msg) {
	let text = (msg.channel.isPrivate) ? msg.content : msg.content.replace(new RegExp(`^<@!?${bot.user.id}>`), '').trim();
	if (text) {
		if (!antiSpam.hasOwnProperty(msg.author.id))
			antiSpam[msg.author.id] = text;
		else {
			if (antiSpam[msg.author.id] == text)
				return;
			antiSpam[msg.author.id] = text;
		}
		if (!msg.channel.isPrivate)
			console.log(cServer(msg.channel.server.name) + " > " + cGreen(msg.author.username) + " > " + cYellow("@" + bot.user.username) + " " + msg.content.replace(new RegExp(`^<@!?${bot.user.id}>`), "").replace(" ", "").replace(/\n/g, " "));
		else
			console.log(cGreen(msg.author.username) + " > " + cYellow("@" + bot.user.username) + " " + msg.content.replace(new RegExp(`^<@!?${bot.user.id}>`), "").replace(/\n/g, " "));
		bot.startTyping(msg.channel);
		Cleverbot.prepare(() => {
			Waifu.write(text, resp => {
				if (/\|/g.test(resp.message)) {
					resp.message = resp.message.replace(/\|/g, '\\u'); //replace | with \u
					resp.message = resp.message.replace(/\\u([\d\w]{4})/gi, (match, grp) => { //unescape unicode
						return String.fromCharCode(parseInt(grp, 16));
					});
				}
				if (!resp.message || !ent.decodeHTML(resp.message)) {
					bot.sendMessage(msg, '⚠ Nothing was returned! Resetting cleverbot...');
					delete require.cache[require.resolve("cleverbot-node")];
					Cleverbot = require('cleverbot-node');
					Waifu = new Cleverbot();
					console.log(cWarn(" WARN ") + " Cleverbot returned nothing");
				} else bot.sendMessage(msg, '💬 ' + ent.decodeHTML(resp.message));
			});
		});
		bot.stopTyping(msg.channel);
	} else {
		if (!antiSpam.hasOwnProperty(msg.author.id))
			antiSpam[msg.author.id] = "";
		else {
			if (antiSpam[msg.author.id] == "")
				return;
			antiSpam[msg.author.id] = "";
		}
		if (!msg.channel.isPrivate)
			console.log(cServer(msg.channel.server.name) + " > " + cGreen(msg.author.username) + " > " + cYellow("@" + bot.user.username) + " " + msg.content.replace(new RegExp(`^<@!?${bot.user.id}>`), "").replace(" ", "").replace(/\n/g, " "));
		else
			console.log(cGreen(msg.author.username) + " > " + cYellow("@" + bot.user.username) + " " + msg.content.replace(new RegExp(`^<@!?${bot.user.id}>`), "").replace(/\n/g, " "));
		bot.sendMessage(msg, 'Yes?');
	}
};
