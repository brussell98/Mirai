var reload = require('require-reload'),
	comma = reload('../../utils/utils.js').comma;

module.exports = {
	desc: "Roll a number between 1 and max.",
	usage: "[max]",
	cooldown: 2,
	task(bot, msg, suffix) {
		let max = /\d+/.test(suffix) ? parseInt(suffix) : 10;
		bot.createMessage(msg.channel.id, `${msg.author.username} rolled **1-${comma(max)}** and got **${comma(~~((Math.random() * max) + 1))}**`);
	}
};
