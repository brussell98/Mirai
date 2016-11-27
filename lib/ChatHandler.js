const chalk = new (require('chalk')).constructor({enabled: true});

class ChatHandler {
	constructor(bot, config) {
		this.bot = bot;

		config = config || {};
		this.allowSelf = !!config.allowSelf;
		this.allowBots = !!config.allowBots;
		this.awaits = {};
		this._nextAwaitId = 0;
		this.defaultHelpCommand = config.defaultHelpCommand !== undefined;

		if (this.defaultHelpCommand === true) {
			this.help = {
				prefix: config.defaultHelpCommand.prefix || '!',
				before: config.defaultHelpCommand.before || '',
				after: config.defaultHelpCommand.after || ''
			}
		}

		this.messageHandler = message => {
			if ((message.author.id === this.bot.user.id && this.allowSelf === false) ||
				(message.author.bot && this.allowBots === false) ||
				(message.channel.guild && this.bot.blacklistedGuilds.includes(message.channel.guild.id)) ||
				this.bot.blacklistedUsers.includes(message.author.id))
				return;

			//console.log(message.channel.name, ':', message.author.username, ':', message.content);

			if (this.defaultHelpCommand && message.content === this.help.prefix + 'help')
				this.getHelp(message);

			this.bot.commandPlugins.forEach(plugin => {
				plugin.handle(message);
			});

			for (let id in this.awaits) {
				if (this.awaits[id].trigger(message)) {
					this.awaits[id].action(message);
					delete this.awaits[id];
				}
			}
		};
	}

	run() {
		this.bot.on('messageCreate', this.messageHandler);
	}

	stop() {
		this.bot.removeListener('messageCreate', this.messageHandler);
	}

	getHelp(message) {
		this.bot.logger.log(`${(message.channel.guild ? chalk.bold.green(message.channel.guild.name) + ' >> ' : '')}${chalk.cyan(message.author.username)} > ${message.cleanContent}`);
		message.channel.createMessage(`${this.help.before + '\n' || ''}${this.bot.commandPlugins.map(plugin => plugin.help).filter(help => !!help).join('\n')}${this.help.after ? '\n' + this.help.after : ''}`);
	}

	awaitMessage(trigger, action, timeout) {
		if (typeof trigger !== 'function' || typeof action !== 'function')
			return new Error('Trigger and action must be functions');

		let id = this._nextAwaitId++;
		this.awaits[id] = { trigger, action };

		if (timeout)
			setTimeout(() => { delete this.awaits[id]; }, timeout);

		return id;
	}
}

module.exports = ChatHandler;
