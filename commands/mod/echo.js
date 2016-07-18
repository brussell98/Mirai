module.exports = {
	desc: "Echo",
	usage: "<text>",
	hidden: true,
	ownerOnly: true,
	task(bot, msg, suffix) {
		bot.createMessage(msg.channel.id, suffix || 'echo');
	}
};
