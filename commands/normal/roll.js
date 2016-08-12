var Nf = new Intl.NumberFormat('en-US');

module.exports = {
	desc: "Roll a number between 1 and max.",
	usage: "[max]",
	cooldown: 2,
	task(bot, msg, suffix) {
		let max = /\d+/.test(suffix) ? parseInt(suffix) : 10;
		bot.createMessage(msg.channel.id, `${msg.author.username} rolled **1-${Nf.format(max)}** and got **${Nf.format(~~((Math.random() * max) + 1))}**`);
	}
};
