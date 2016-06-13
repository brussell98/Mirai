var reload		= require('require-reload')(require),
	cleverbot	= reload('../special/cleverbot.js');

module.exports = {
	handler(bot, msg, CommandManagers, config) {
		if (msg.author.bot)
			return;

		for (let i = 0; i < CommandManagers.length; i++) {
			if (msg.content.startsWith(CommandManagers[i].prefix))
				return CommandManagers[i].processCommand(bot, msg, config);
		}

		if (config.cleverbot && msg.channel.isPrivate || (msg.isMentioned(bot.user) && msg.content.startsWith(new RegExp(`<@!?${bot.user.id}>`))))
			cleverbot(bot, msg);
	},
	reloadCleverbot() {
		cleverbot = reload('../special/cleverbot.js');
	}
}
