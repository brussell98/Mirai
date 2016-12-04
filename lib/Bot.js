const Logger = require('./Logger.js'),
	ChatHandler = require('./ChatHandler.js'),
	Eris = require('eris'),
	axios = require('axios');

var Promise;
try {
	Promise = require("bluebird");
} catch(err) {
	Promise = global.Promise;
}

/**
 * Manages the connection to Discord and interaction between plugins
 * @extends Eris.Client
 * @see {@link  https://abal.moe/Eris/docs/Client|Eris.Client}
 */
class Bot extends Eris.Client {
	/**
	 * Creates a new instance of Mirai
	 * @param {Object} [options] An object defining the configuration for Mirai
	 * @param {Class} [rLogger] A replacement Logger. Must implement `log` `info` `debug` `warn` and `error`
	 * @param {Class} [rChatHandler] A replacement ChatHandler. Must implement `run` and `stop`
	 * @example <caption>Create a new instance of Mirai</caption>
	 * const Mirai = require('mirai-bot-discord');
	 * var config = require('./config.json');
	 * var mirai = new Mirai(config);
	 */
	constructor(options = {}, rLogger, rChatHandler) {
		super(options.token, options.eris);

		this.carbonBotsKey = options.carbonBotsKey;
		this.discordBotsKey = options.discordBotsKey;

		this.logger = rLogger || new Logger(options.logger);
		this.chatHandler = rChatHandler || new ChatHandler(this, options.chatHandler);
		this.blacklistedGuilds = options.blacklistedGuilds || [];
		this.blacklistedUsers = options.blacklistedUsers || [];
		this.commandPlugins = [];
		this.eventPlugins = [];
		this.middleware = [];

		this.on('ready', () => {
			this.chatHandler.run();
			this.logger.info('Mirai: Connected to Discord');
		});

		this.on('error', (error, shard) => {
			if (error)
				this.logger.error(`Mirai: Shard ${shard} error: `, error);
		});

		this.on('disconnected', () => {
			this.logger.error('Mirai: Disconnected from Discord');
		});

		this.on('shardReady', shard => {
			this.logger.info(`Mirai: Shard ${shard} ready`);
		});

		this.on('shardDisconnect', (error, shard) => {
			this.logger.warn(`Mirai: Shard ${shard} disconnected` + (error ? ': ' + error.message : ''));
		});

		this.on('shardResume', shard => {
			this.logger.info(`Mirai: Shard ${shard} resumed`);
		});

		if (this.blacklistedGuilds.length !== 0) {
			this.on('guildCreate', guild => {
				if (this.blacklistedGuilds.includes(guild.id)) {
					guild.leave();
					this.logger.info('Mirai: Left blacklisted guild', guild.name); // TODO
				}
			});
		}

		if (options.gracefulExit === true) {
			process.on('SIGINT', () => {
				let destroyAll = this.commandPlugins.map(p => p.destroy()).concat( this.eventPlugins.map(p => p.destroy()),  this.middleware.map(m => m.destroy()))
				this.disconnect({reconnect: false});
				Promise.all(destroyAll).then(() => process.exit(0)).catch(error => {
					this.logger.error(error);
					process.exit(1);
				});
			});
		}
	}

	/**
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @see {@link AbstractCommandPlugin}
	 * @example <caption>Loading a Command Plugin</caption>
	 * var funCommands = new FunCommandsPlugin();
	 * mirai.loadCommandPlugin(funCommands);
	 * @returns {Promise} The result of `plugin.load`
	 */
	loadCommandPlugin(plugin) {
		return plugin.load(this).then(() => {
			this.commandPlugins.push(plugin);
		});
	}

	reloadCommandPlugin(plugin) {
		new Promise((resolve, reject) => {
			let _plugin = this.commandPlugins.findIndex(p => p.name === plugin.name);
			if (_plugin === -1) {
				plugin.load(this).then(() => {
					this.commandPlugins.push(plugin);
					resolve();
				}).catch(reject);
			} else {
				this.commandPlugins[_plugin].destroy().then(() => {
					plugin.load(this).then(() => {
						this.commandPlugins.push(plugin);
						resolve();
					}).catch(reject);
				}).catch(reject);
				this.commandPlugins.splice(_plugin, 1);
			}
		});
	}

	/**
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise}
	 */
	loadEventPlugin(plugin) {
		return plugin.load(this).then(() => {
			this.eventPlugins.push(plugin);
		});
	}

	reloadEventPlugin(plugin) {
		new Promise((resolve, reject) => {
			let _plugin = this.eventPlugins.findIndex(p => p.name === plugin.name);
			if (_plugin === -1) {
				plugin.load(this).then(() => {
					this.eventPlugins.push(plugin);
					resolve();
				}).catch(reject);
			} else {
				this.eventPlugins[_plugin].destroy().then(() => {
					plugin.load(this).then(() => {
						this.eventPlugins.push(plugin);
						resolve();
					}).catch(reject);
				}).catch(reject);
				this.eventPlugins.splice(_plugin, 1);
			}
		});
	}

	loadMiddleware(middleware) {
		return middleware.load(this).then(() => {
			this.middleware.push(middleware);
		});
	}

	reloadMiddleware(middleware) {
		new Promise((resolve, reject) => {
			let _middleware = this.middleware.findIndex(m => m.name === middleware.name);
			if (_middleware === -1) {
				middleware.load(this).then(() => {
					this.middleware.push(middleware);
					resolve();
				}).catch(reject);
			} else {
				this.middleware[_middleware].destroy().then(() => {
					middleware.load(this).then(() => {
						this.middleware.push(middleware);
						resolve();
					}).catch(reject);
				}).catch(reject);
				this.middleware.splice(_middleware, 1);
			}
		});
	}

	/**
	 * Updates information on carbonitex.net
	 * @param {String} [key] Carbon API key
	 * @returns {Promise} The axios request
	 * @see {@link https://github.com/mzabriskie/axios/blob/master/README.md#response-schema|Axios response}
	 */
	updateCarbon(key) {
		return axios.post('https://www.carbonitex.net/discord/data/botdata.php', {
			key: key || this.carbonBotsKey,
			servercount: this.guilds.size
		}).then(response => {
			this.logger.debug('Sent servercount:', this.guilds.size, 'to carbonitex.net. Response:', response.status);
		}).catch(error => {
			if (error.response)
				return this.logger.warn('Error: Response status', error.response.status, 'from carbonitex.net. Data:', error.response.data);
			this.logger.error('Error during axios request:', error.stack);
		});
	}

	/**
	 * Updates information on bots.discord.pw
	 * @param {String} [key] bots.discord.pw API key
	 * @returns {Promise} The axios request
	 * @see {@link https://github.com/mzabriskie/axios/blob/master/README.md#response-schema|Axios response}
	 */
	updateDiscordBots(key) {
		return axios.post(`https://bots.discord.pw/api/bots/${this.user.id}/stats`, { server_count: this.guilds.size }, {
			headers: { 'Authorization': key || this.discordBotsKey }
		}).then(response => {
			this.logger.debug('Sent server_count:', this.guilds.size, 'to bots.discord.pw. Response:', response.status);
		}).catch(error => {
			if (error.response)
				return this.logger.warn('Error: Response status', error.response.status, 'from bots.discord.pw. Data:', error.response.data);
			this.logger.error('Error during axios request:', error.stack);
		});
	}

	/**
	 * Sets the bot's avatar from a url
	 * @param {String} url A direct link to an image
	 * @returns {Promise} Rejects with an error, if there is one. May be a `String` or `Error`
	 */
	setAvatar(url) {
		return new Promise((resolve, reject) => {
			axios.get(url, {
				headers: { 'Accept': 'image/*' },
				responseType: 'arraybuffer'
			}).then(response => {
				this.editSelf({avatar: `data:${response.headers['content-type']};base64,${response.data.toString('base64')}`})
					.then(() => {
						this.logger.debug('Updated avatar from ' + url);
						resolve();
					}).catch(error => {
						this.logger.warn(`Failed to update avatar from ${url}: ${error}`);
						reject(error);
					});
			}).catch(error => {
				error = error.response ? error.response.data || error.response.status : error.message
				this.logger.warn('Failed to fetch avatar: ' + error);
				reject(error);
			});
		});
	}

	/**
	 * Resolve a name to a user
	 * @param {String} query The name to match
	 * @returns {User?} The user the was found, or null
	 * @see {@link https://abal.moe/Eris/docs/User|Eris.User}
	 */
	findUser(query) {
		query = query.toLowerCase().trim();
		let result = null;
		result = this.users.find(user => user.username.toLowerCase() === query);
		if (!result)
			result = this.users.find(user => user.username.toLowerCase().includes(query));
		return result || null;
	}

	/**
	 * Resolve a name to a guild member
	 * @param {String} query The name to match
	 * @param {Collection} members The Collection of guild members
	 * @returns {Member?} The member the was found, or null
	 * @see {@link https://abal.moe/Eris/docs/Member|Eris.Member}
	 */
	findMember(query, members) {
		query = query.toLowerCase().trim();
		let result = null;
		result = members.find(member => member.user.username.toLowerCase() === query);
		if (!result) result = members.find(member => member.nick && member.nick.toLowerCase() === query);
		if (!result) result = members.find(member => member.user.username.toLowerCase().includes(query));
		if (!result) result = members.find(member => member.nick && member.nick.toLowerCase().includes(query));
		return result || null;
	}
}

module.exports = Bot;
