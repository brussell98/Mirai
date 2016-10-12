class ChatHandler {
	constructor(bot, config) {
		this.bot = bot;

		config = config || {};
		this.allowSelf = !!config.allowSelf;
		this.allowBots = !!config.allowBots;
		this.ignoredGuilds = config.ignoredGuilds || [];
		this.defaultHelpCommand = !!config.defaultHelpCommand;

		if (this.defaultHelpCommand === true) {
			this.help = {
				prefix: config.help.prefix || '!',
				before: config.help.before || '',
				after: config.help.after || ''
			}
		}

		this.messageHandler = message => {
			if (message.author.id === this.bot.client.user.id && this.allowSelf === false)
				return;
			if (message.author.bot === true && this.allowBots === false)
				return;
			if (message.channel.guild === undefined && this.ignoredGuilds.includes(message.channel.guild.id))
				return;
			if (this.defaultHelpCommand === true && message.content === this.help.prefix + 'help')
				this.getHelp(message);

			this.bot.commandPlugins.forEach(plugin => {
				plugin.handle(message);
			});
		};
	}

	run() {
		this.bot.client.on('messageCreate', this.messageHandler);
	}

	stop() {
		this.bot.client.removeListener('messageCreate', this.messageHandler);
	}

	getHelp(message) {
		message.channel.createMessage(`${this.help.before || ''}${this.bot.commandPlugins.map(p => p.help).filter(h => !!h).join('\n')}${this.help.after ? '\n' + this.help.after : ''}`);
	}
}

module.exports = ChatHandler;
