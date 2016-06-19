module.exports = {
	desc: "Echo",
	usage: "<text>",
	hidden: true,
	task(bot, msg, suffix, config) {
		if (config.adminIds.includes(msg.author.id) && suffix)
			bot.sendMessage(msg, suffix);
	}
};
