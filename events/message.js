var reload		= require('require-reload')(require),
	cleverbot	= reload('../special/cleverbot.js');

module.exports = {
	handler(bot, msg, CommandManagers, config) {
		if (msg.author.bot)
			return;

		for (let i = 0; i < CommandManagers.length; i++) {
			console.log(`${cDebug(' MESSAGE HANDLER ')} Checking against prefix for CommandManager ${i} (${CommandManagers[i].prefix})`);
			if (msg.content.startsWith(CommandManagers[i].prefix))
				return //CommandManagers[i].processCommand(bot, msg, config);
		}

		if (config.cleverbot && msg.channel.isPrivate || (msg.isMentioned(bot.user) && msg.content.search(new RegExp(`^<@!?${bot.user.id}>`)) === 0))
			cleverbot(bot, msg);
	},
	reloadCleverbot() {
		cleverbot = reload('../special/cleverbot.js');
	}
}
