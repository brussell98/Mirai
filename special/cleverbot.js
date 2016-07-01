var reload		= require('require-reload')(require),
	Cleverbot	= reload('cleverbot-node'),
	Waifu		= new Cleverbot(),
	entities	= require('entities'),
	antiSpam	= {};

Cleverbot.prepare(() => {});

function reset() {
	Cleverbot = reload('cleverbot-node');
	Waifu = new Cleverbot();
	Cleverbot.prepare(() => {});
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

function trimText(cleanContent, name, discriminator) {
	return cleanContent.replace(`@${name}#${discriminator}`, '').trim(); //Removes the @Bot part
}

function processUnicode(text) {
	if (/\|/g.test(text)) //Cleverbot returns unicode like |1234 for some reason. This fixes it
		return text.replace(/\|/g, '\\u').replace(/\\u([\d\w]{4})/gi, (match, grp) => String.fromCharCode(parseInt(grp, 16))); //unescape unicode
	return text;
}

module.exports = function(bot, msg) {
	let text = msg.channel.guild === null ? msg.content : trimText(msg.cleanContent, msg.channel.guild.members.get(bot.user.id).nick || bot.user.username, bot.user.discriminator);
	if (spamCheck(msg.author.id, text)) {
		if (msg.channel.guild === null)
			console.log(`${cGreen(msg.author.username)} > ${cYellow("@" + bot.user.username)} ${text}`);
		else
			console.log(`${cServer(msg.channel.guild.name)} >> ${cGreen(msg.author.username)} > ${cYellow("@" + bot.user.username)} ${text}`);

		if (text === '') //If they just did @Botname
			bot.createMessage(msg.channel.id, 'Yes?');
		else {
			Waifu.write(text, response => {
				response = processUnicode(response.message);
				if (response)
					bot.createMessage(msg.channel.id, '💬 ' + entities.decodeHTML(response));
				else { //API returned nothing back
					reset();
					console.log(`${cWarn(' WARN ')} Nothing was returned bu the cleverbot API. Reloading it now.`);
					bot.createMessage(msg.channel.id, '⚠ There was an error, try again.');
				}
			});
		}
	}
}
