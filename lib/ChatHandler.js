var EventEmitter;
try {
	EventEmitter = require("eventemitter3");
} catch(err) {
	EventEmitter = require("events").EventEmitter;
}

class ChatHandler extends EventEmitter {
	constructor(bot, config) {
		super();
		this.bot = bot;

		config = config || {};
		this.allowSelf = !!config.allowSelf;
		this.allowBots = !!config.allowBots;
		this.ignoredGuilds = config.ignoredGuilds || [];

		this.messageHandler = message => {
			if (message.author.id === this.bot.client.user.id && this.allowSelf === false)
				return;
			if (message.author.bot === true && this.allowBots === false)
				return;
			if (message.channel.guild === undefined && this.ignoredGuilds.includes(message.channel.guild.id))
				return;
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
}

module.exports = ChatHandler;
