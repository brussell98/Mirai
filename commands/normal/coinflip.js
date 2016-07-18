module.exports = {
	desc: "Flip a coin.",
	aliases: ['coin', 'flip'],
	cooldown: 1,
	task(bot, msg) {
		bot.createMessage(msg.channel.id, `${msg.author.username} flipped a coin and it landed on ${Math.random() < .5 ? 'heads' : 'tails'}`);
	}
};
