var Nf = new Intl.NumberFormat('en-US');

module.exports = {
	desc: "Roll a number between the given range.",
	usage: "[[min-]max]",
	cooldown: 2,
	aliases: ['random'],
	task(bot, msg, suffix) {
		let args = suffix.match(/(?:(\d+)-)?(\d+)/);
		let roll = args === null
			? [1, 10]
			: [parseInt(args[1]) || 1, parseInt(args[2])];
		bot.createMessage(msg.channel.id, `${msg.author.username} rolled **${Nf.format(roll[0])}-${Nf.format(roll[1])}** and got **${Nf.format(~~((Math.random() * (roll[1] - roll[0] + 1)) + roll[0]))}**`);
	}
};
