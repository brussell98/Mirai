var reload		= require('require-reload')(require),
	Cleverbot	= reload('cleverbot-node'),
	Waifu		= new Cleverbot(),
	entities	= require('entities');

var antiSpam = {};
Waifu.prepare();

function reset() {
	Cleverbot = reload('cleverbot-node');
	Waifu = new Cleverbot();
	Waifu.prepare();
}

function spamCheck(userId, text) {
	if (!antiSpam.hasOwnProperty(userId)) { //If user not there add them
		antiSpam[userId] = text;
		return true;
	}
	if (antiSpam[userId] == text) //If user sent the same message ignore it
		return false;
	antiSpam[userId] = text;
	return true;
}

function trimText(cleanContent, name) {
	return cleanContent.replace(`@${name}`, '').trim(); //Removes the @Bot part
}

function processUnicode(text) {
	if (/\|/g.test(text)) { //Cleverbot returns unicode like |1234 for some reason. This fixes it
		text = text.replace(/\|/g, '\\u'); //replace | with \u
		text = text.replace(/\\u([\d\w]{4})/gi, (match, grp) => String.fromCharCode(parseInt(grp, 16))); //unescape unicode
	}
	return text;
}

module.exports = function(bot, msg) {
	let text = msg.channel.isPrivate ? msg.content : trimText(msg.cleanContent, msg.server.detailsOfUser(bot.user).nick || bot.user.username);
	if (spamCheck(msg.author.id, text)) {
		if (msg.channel.isPrivate)
			console.log(`${cGreen(msg.author.username)} > ${cYellow("@" + bot.user.username)} ${text}`);
		else
			console.log(`${cServer(msg.server.name)} >> ${cGreen(msg.author.username)} > ${cYellow("@" + bot.user.username)} ${text}`);

		if (text === '') //If they just did @Botname
			bot.sendMessage(msg, 'Yes?');
		else {
			Waifu.write(text, response => {
				response = processUnicode(response.message);
				if (response)
					bot.sendMessage(msg, '💬 ' + entities.decodeHTML(response));
				else { //API returned nothing back
					reset();
					console.log(`${cWarn(' WARN ')} Nothing was returned bu the cleverbot API. Reloading it now.`);
					bot.sendMessage(msg, '⚠ There was an error, try again.');
				}
			});
		}
	}
}
