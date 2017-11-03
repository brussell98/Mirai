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
 * @prop {String} discordBotsOrgKey The API key for discordbots.org
 * @prop {Function} logger The logging wrapper
 * @prop {Function} chatHandler The class handling chat messages
 * @prop {Array<String>} blacklistedGuilds Guilds that are banned from using the bot
 * @prop {Array<String>} blacklistedUsers Users that are banned from using the bot
 * @prop {Object} commandPlugins The loaded command plugins
 * @prop {Object} eventPlugins The loaded event plugins
 * @prop {Object} middleware The loaded middleware
 * @see {@link https://abal.moe/Eris/docs/Client|Eris.Client}
 */
class Bot extends Eris.Client {
	/**
	 * Creates a new instance of Mirai
	 * @param {Object} options An object defining the configuration for Mirai
	 * @param {String} options.token The token for your bot
	 * @param {Boolean} [options.carbonBotsKey] The API key for carbon's bot list
	 * @param {Boolean} [options.discordBotsKey] The API key for the discord bots website
	 * @param {Boolean} [options.discordBotsOrgKey] The API key for the discordbots.org website
	 * @param {Array<String>} [options.blacklistedGuilds] Guilds that are banned from using the bot
	 * @param {Array<String>} [options.blacklistedUsers] Users that are banned from using the bot
	 * @param {Boolean} [options.gracefulExit] When SIGINT is received, destroy all plugins and middleware, and disconnect the bot
	 * @param {Object} [options.eris] The options to pass to the eris client. See {@link https://abal.moe/Eris/docs/Client|the Eris docs}
	 * @param {Object} [options.logger] The options to pass to the logger
	 * @param {Object} [options.chatHandler] The options to pass to the chatHandler
	 * @param {Function} [rLogger] A replacement Logger. Must implement `log` `info` `debug` `warn` and `error`. Is passed `this` and `options.logger`
	 * @param {Function} [rChatHandler] A replacement ChatHandler. Must implement `run` and `stop`. Is passed `this` and `options.chatHandler`
	 * @example <caption>Create a new instance of Mirai</caption>
	 * const Mirai = require('mirai-bot-discord');
	 * var config = require('./config.json');
	 * var mirai = new Mirai(config);
	 */
	constructor(options = {}, rLogger, rChatHandler) {
		super(options.token, options.eris);

		this.carbonBotsKey = options.carbonBotsKey;
		this.discordBotsKey = options.discordBotsKey;
		this.discordBotsOrgKey = options.discordBotsOrgKey;

		this.logger = rLogger ? new rLogger(this, options.logger) : new Logger(options.logger);
		this.chatHandler = rChatHandler ? new rChatHandler(this, options.chatHandler) : new ChatHandler(this, options.chatHandler);
		this.blacklistedGuilds = options.blacklistedGuilds || [];
		this.blacklistedUsers = options.blacklistedUsers || [];
		this.commandPlugins = { };
		this.eventPlugins = { };
		this.middleware = { };

		this.once('ready', () => {
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
			if (error)
				this.logger.warn(`Mirai: Shard ${shard} disconnected`, error.message);
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
				this.logger.info('SIGINT detected, shutting down');
				let destroyAll = this.commandPlugins.map(p => p.destroy()).concat(this.eventPlugins.map(p => p.destroy()), this.middleware.map(m => m.destroy()));
				this.disconnect({ reconnect: false });
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
		if (!plugin.name || !!this.commandPlugins[plugin.name])
			return Promise.reject('Plugin must have a unique name');

		return plugin.load(this).then(() => {
			this.commandPlugins[plugin.name] = plugin;
		});
	}

	/**
	 * Reload a plugin by searching for a plugin with the same name and replacing it
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} Rejects with an error, if there is one
	 */
	reloadCommandPlugin(plugin) {
		if (!plugin.name)
			return Promise.reject('Plugin must have a name');

		if (!this.commandPlugins[plugin.name])
			return Promise.reject(`No command plugin with name ${plugin.name} is loaded`);

		return new Promise((resolve, reject) => {
			return this.commandPlugins[plugin.name].destroy()
				.then(() => plugin.load(this))
				.then(() => { this.commandPlugins[plugin.name] = plugin })
				.catch(reject);
		});
	}

	/**
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} The result of `plugin.load`
	 */
	loadEventPlugin(plugin) {
		if (!plugin.name || !!this.eventPlugins[plugin.name])
			return Promise.reject('Plugin must have a unique name');

		return plugin.load(this).then(() => {
			this.eventPlugins[plugin.name] = plugin;
		});
	}

	/**
	 * Reload a plugin by searching for a plugin with the same name and replacing it
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} Rejects with an error, if there is one
	 */
	reloadEventPlugin(plugin) {
		if (!plugin.name)
			return Promise.reject('Plugin must have a name');

		if (!this.eventPlugins[plugin.name])
			return Promise.reject(`No event plugin with name ${plugin.name} is loaded`);

		return new Promise((resolve, reject) => {
			return this.eventPlugins[plugin.name].destroy()
				.then(() => plugin.load(this))
				.then(() => { this.eventPlugins[plugin.name] = plugin })
				.catch(reject);
		});
	}

	/**
	 * @param {Function} middleware The middleware to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} The result of `middleware.load`
	 */
	loadMiddleware(middleware) {
		if (!middleware.name || !!this.middleware[middleware.name])
			return Promise.reject('Middleware must have a unique name');

		return middleware.load(this).then(() => {
			this.middleware[middleware.name] = middleware;
		});
	}

	/**
	 * Reload middleware by searching for middleware with the same name and replacing it
	 * @param {Function} middleware The middleware to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} Rejects with an error, if there is one
	 */
	reloadMiddleware(middleware) {
		if (!middleware.name)
			return Promise.reject('Middleware must have a name');

		if (!this.middleware[middleware.name])
			return Promise.reject(`No middleware with name ${middleware.name} is loaded`);

		return new Promise((resolve, reject) => {
			return this.middleware[middleware.name].destroy()
				.then(() => middleware.load(this))
				.then(() => { this.middleware[middleware.name] = middleware })
				.catch(reject);
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
	 * Updates information on discordbots.org
	 * @param {String} [key] discordbots API key
	 * @returns {Promise} The axios request
	 * @see {@link https://github.com/mzabriskie/axios/blob/master/README.md#response-schema|Axios response}
	 */
	updateDiscordBotsOrg(key) {
		return axios.post(`https://discordbots.org/api/bots/${this.user.id}/stats`, { server_count: this.guilds.size }, {
			headers: { 'Authorization': key || this.discordBotsOrgKey }
		}).then(response => {
			this.logger.debug('Sent server_count:', this.guilds.size, 'to discordbots.org. Response:', response.status);
		}).catch(error => {
			if (error.response)
				return this.logger.warn('Response status', error.response.status, 'from discordbots.org. Data:', error.response.data);
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
			return axios.get(url, {
				headers: { 'Accept': 'image/*' },
				responseType: 'arraybuffer'
			}).then(response => {
				this.editSelf({avatar: `data:${response.headers['content-type']};base64,${response.data.toString('base64')}`})
					.then(() => {
						this.logger.debug('Updated avatar from ' + url);
						return resolve();
					}).catch(error => {
						this.logger.warn('Failed to update avatar from ' + url, error);
						return reject(error);
					});
			}).catch(error => {
				error = error.response ? error.response.data || error.response.status : error.message
				this.logger.warn('Failed to fetch avatar', error);
				return reject(error);
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

		let result;
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

		let result;
		result = members.find(member => member.user.username.toLowerCase() === query);
		if (!result) result = members.find(member => member.nick && member.nick.toLowerCase() === query);
		if (!result) result = members.find(member => member.user.username.toLowerCase().includes(query));
		if (!result) result = members.find(member => member.nick && member.nick.toLowerCase().includes(query));
		return result || null;
	}
}

module.exports = Bot;
