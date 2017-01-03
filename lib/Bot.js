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
 * @prop {String} carbonBotsKey The API key for carbon
 * @prop {String} discordBotsKey The API key for discord bots
 * @prop {Function} logger The logging wrapper
 * @prop {Function} chatHandler The class handling chat messages
 * @prop {Array<String>} blacklistedGuilds Guilds that are banned from using the bot
 * @prop {Array<String>} blacklistedUsers Users that are banned from using the bot
 * @prop {Array<Function>} commandPlugins The loaded command plugins
 * @prop {Array<Function>} eventPlugins The loaded event plugins
 * @prop {Array<Function>} middleware The loaded middleware
 * @see {@link  https://abal.moe/Eris/docs/Client|Eris.Client}
 */
class Bot extends Eris.Client {
	/**
	 * Creates a new instance of Mirai
	 * @param {Object} options An object defining the configuration for Mirai
	 * @param {String} options.token The token for your bot
	 * @param {Boolean} [options.carbonBotsKey] The API key for carbon's bot list
	 * @param {Boolean} [options.carbonBotsKey] The API key for the discord bots website
	 * @param {Array<String>} [options.blacklistedGuilds] Guilds that are banned from using the bot
	 * @param {Array<String>} [options.blacklistedUsers] Users that are banned from using the bot
	 * @param {Boolean} [options.gracefulExit] When SIGINT is recieved, destroy all plugins and middleware, and disconnect the bot
	 * @param {Object} [options.eris] The options to pass to the eris client. See {@link https://abal.moe/Eris/docs/Client|the Eris docs}
	 * @param {Object} [options.logger] The options to pass to the logger
	 * @param {Object} [options.chatHandler] The options to pass to the chatHandler
	 * @param {Function} [rLogger] A replacement Logger. Must implement `log` `info` `debug` `warn` and `error`
	 * @param {Function} [rChatHandler] A replacement ChatHandler. Must implement `run` and `stop`
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
		}).on('error', (error, shard) => {
			if (error)
				this.logger.error(`Mirai: Shard ${shard} error: `, error);
		}).on('disconnected', () => {
			this.logger.warn('Mirai: Disconnected from Discord');
		}).on('shardReady', shard => {
			this.logger.info(`Mirai: Shard ${shard} ready`);
		}).on('shardDisconnect', (error, shard) => {
			this.logger.warn(`Mirai: Shard ${shard} disconnected` + (error ? ': ' + error.message : ''));
		}).on('shardResume', shard => {
			this.logger.info(`Mirai: Shard ${shard} resumed`);
		});

		if (this.blacklistedGuilds.length !== 0) {
			this.on('guildCreate', guild => {
				if (this.blacklistedGuilds.includes(guild.id)) {
					guild.leave();
					this.logger.info('Mirai: Left blacklisted guild', guild.name);
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

	/**
	 * Reload a plugin by seaching for a plugin with the same name and removing it
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} Rejects with an error, if there is one
	 */
	reloadCommandPlugin(plugin) {
		return new Promise((resolve, reject) => {
			let _pluginIndex = this.commandPlugins.findIndex(p => p.name === plugin.name);
			if (_pluginIndex === -1) {
				plugin.load(this).then(() => {
					this.commandPlugins.push(plugin);
					resolve();
				}).catch(reject);
			} else {
				this.commandPlugins[_pluginIndex].destroy().then(() => {
					plugin.load(this).then(() => {
						this.commandPlugins[_pluginIndex] = plugin;
						resolve();
					}).catch(reject);
				}).catch(reject);
			}
		});
	}

	/**
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} The result of `plugin.load`
	 */
	loadEventPlugin(plugin) {
		return plugin.load(this).then(() => {
			this.eventPlugins.push(plugin);
		});
	}

	/**
	 * Reload a plugin by seaching for a plugin with the same name and removing it
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} Rejects with an error, if there is one
	 */
	reloadEventPlugin(plugin) {
		return new Promise((resolve, reject) => {
			let _pluginIndex = this.eventPlugins.findIndex(p => p.name === plugin.name);
			if (_pluginIndex === -1) {
				plugin.load(this).then(() => {
					this.eventPlugins.push(plugin);
					resolve();
				}).catch(reject);
			} else {
				this.eventPlugins[_pluginIndex].destroy().then(() => {
					plugin.load(this).then(() => {
						this.eventPlugins[_pluginIndex] = plugin;
						resolve();
					}).catch(reject);
				}).catch(reject);
			}
		});
	}

	/**
	 * @param {Function} middleware The middleware to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} The result of `middleware.load`
	 */
	loadMiddleware(middleware) {
		return middleware.load(this).then(() => {
			this.middleware.push(middleware);
		});
	}

	/**
	 * Reload middleware by seaching for middleware with the same name and removing it
	 * @param {Function} middleware The middleware to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} Rejects with an error, if there is one
	 */
	reloadMiddleware(middleware) {
		return new Promise((resolve, reject) => {
			let _middlewareIndex = this.middleware.findIndex(m => m.name === middleware.name);
			if (_middlewareIndex === -1) {
				middleware.load(this).then(() => {
					this.middleware.push(middleware);
					resolve();
				}).catch(reject);
			} else {
				this.middleware[_middlewareIndex].destroy().then(() => {
					middleware.load(this).then(() => {
						this.middleware[_middlewareIndex] = middleware;
						resolve();
					}).catch(reject);
				}).catch(reject);
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
				return this.logger.warn('Response status', error.response.status, 'from carbonitex.net. Data:', error.response.data);
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
				return this.logger.warn('Response status', error.response.status, 'from bots.discord.pw. Data:', error.response.data);
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
	 * Resolve a name or ID to a user
	 * @param {String} query The name or ID to match
	 * @returns {User?} The user the was found, or null
	 * @see {@link https://abal.moe/Eris/docs/User|Eris.User}
	 */
	findUser(query) {
		query = query.toLowerCase().trim();

		if (/^[0-9]+$/.test(query)) { // If query looks like an ID try to get by ID
			let user = this.users.get(query);
			if (user)
				return user;
		}

		let result = null;
		result = this.users.find(user => user.username.toLowerCase() === query);
		if (!result)
			result = this.users.find(user => user.username.toLowerCase().includes(query));
		return result || null;
	}

	/**
	 * Resolve a name or ID to a guild member
	 * @param {String} query The name or ID to match
	 * @param {Collection} members The Collection of guild members
	 * @returns {Member?} The member the was found, or null
	 * @see {@link https://abal.moe/Eris/docs/Member|Eris.Member}
	 */
	findMember(query, members) {
		query = query.toLowerCase().trim();

		if (/^[0-9]+$/.test(query)) { // If query looks like an ID try to get by ID
			let member = members.get(query);
			if (member)
				return member;
		}

		let result = null;
		result = members.find(member => member.user.username.toLowerCase() === query);
		if (!result) result = members.find(member => member.nick && member.nick.toLowerCase() === query);
		if (!result) result = members.find(member => member.user.username.toLowerCase().includes(query));
		if (!result) result = members.find(member => member.nick && member.nick.toLowerCase().includes(query));
		return result || null;
	}
}

module.exports = Bot;
