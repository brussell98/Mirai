const chalk = new (require('chalk')).constructor({enabled: true});

/** Handles messages recieved by the client */
class ChatHandler {
	/**
	 * Creates a new ChatHandler
	 * @param {Bot} [bot] The main client
	 * @param {Object} [options] The configuration to use.
	 */
	constructor(bot, options = {}) {
		this.bot = bot;

		this.allowSelf = !!options.allowSelf;
		this.allowBots = !!options.allowBots;
		this.awaits = {};
		this._nextAwaitId = 0;
		this.defaultHelpCommand = options.defaultHelpCommand !== undefined;

		if (this.defaultHelpCommand === true) {
			this.help = {
				prefix: options.defaultHelpCommand.prefix || '!',
				before: options.defaultHelpCommand.before || '',
				after: options.defaultHelpCommand.after || ''
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

	/** Starts listening for messages */
	run() {
		this.bot.on('messageCreate', this.messageHandler);
	}

	/** Stops listening for messages */
	stop() {
		this.bot.removeListener('messageCreate', this.messageHandler);
	}

	/**
	 * Generate and send a help message
	 * @param {Message} message The message to respond to
	 */
	getHelp(message) {
		this.bot.logger.log(`${(message.channel.guild ? chalk.bold.green(message.channel.guild.name) + ' >> ' : '')}${chalk.cyan(message.author.username)} > ${message.cleanContent}`);
		message.channel.createMessage(`${this.help.before + '\n' || ''}${this.bot.commandPlugins.map(plugin => plugin.help).filter(help => !!help).join('\n')}${this.help.after ? '\n' + this.help.after : ''}`);
	}

	/**
	 * Add an await, which will trigger under certain conditions
	 * @param {Function} trigger A funcion that takes a Message and returns a Boolean
	 * @param {Function} action A function to be executed when `trigger` returns true
	 * @param {Number} [timeout] Delete the await after this many milliseconds
	 * @returns {Number} The unique id of the await
	 */
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
