var reload		= require('require-reload')(require),
	cleverbot	= reload('../special/cleverbot.js');

module.exports = {
	handler(bot, msg, CommandManagers, config, settingsManager) {
		if (msg.author.bot)
			return;

		for (let i = 0; i < CommandManagers.length; i++) {
			if (msg.content.startsWith(CommandManagers[i].prefix)) {
				console.log(`${cDebug(' MESSAGE HANDLER ')} Message matched prefix for CommandManager ${i} (${CommandManagers[i].prefix})`);
				return CommandManagers[i].processCommand(bot, msg, config, settingsManager);
			}
		}

		if (config.cleverbot && !msg.channel.guild || (msg.mentions.includes(bot.user.id) && msg.content.search(new RegExp(`^<@!?${bot.user.id}>`)) === 0))
			cleverbot(bot, msg);
	},
	reloadCleverbot() {
		cleverbot = reload('../special/cleverbot.js');
	}
}
