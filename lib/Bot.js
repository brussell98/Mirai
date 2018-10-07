const Logger = require('./Logger.js');
const ChatHandler = require('./ChatHandler.js');
const Eris = require('eris');
const axios = require('axios');

let Promise;
try {
	Promise = require("bluebird");
} catch(err) {
	Promise = global.Promise;
}

/**
 * Manages the connection to Discord and interaction between plugins
 * @extends Eris.Client
 * @prop {String} carbonBotsKey The API key for carbon bot list
 * @prop {String} discordBotsKey The API key for bots.discord.pw
 * @prop {String} discordBotsOrgKey The API key for discordbots.org
 * @prop {String} botsOnDiscordKey The API key for bots.ondiscord.xyz
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
	 * @param {String} [options.carbonBotsKey] An API key for carbon bot list
	 * @param {String} [options.discordBotsKey] An API key for bots.discord.pw
	 * @param {String} [options.discordBotsOrgKey] An API key for discordbots.org
	 * @param {String} [options.botsOnDiscordKey] An API key for bots.ondiscord.xyz
	 * @param {Array<String>} [options.blacklistedGuilds] Guilds that are banned from using the bot
	 * @param {Array<String>} [options.blacklistedUsers] Users that are banned from using the bot
	 * @param {Boolean} [options.gracefulExit] When SIGINT is received, destroy all plugins and middleware, and disconnect the bot
	 * @param {Object} [options.eris] The options to pass to the eris client. See {@link https://abal.moe/Eris/docs/Client|the Eris docs}
	 * @param {Object} [options.logger] The options to pass to the logger
	 * @param {Object} [options.chatHandler] The options to pass to the chatHandler
	 * @param {Function} [rLogger] A replacement Logger. Must implement `log` `info` `debug` `warn` and `error`. Is passed `this` and `options.logger`
	 * @param {Function} [rChatHandler] A replacement ChatHandler. Must implement `run` and `stop`. Is passed `this` and `options.chatHandler`
	 * @example <caption>Create a new instance of Mirai</caption>
	 * const Mirai = require('mirai-bot-core');
	 * var config = require('./config.json');
	 * var mirai = new Mirai(config);
	 */
	constructor(options = { }, rLogger, rChatHandler) {
		super(options.token, options.eris);

		this.carbonBotsKey = options.carbonBotsKey;
		this.discordBotsKey = options.discordBotsKey;
		this.discordBotsOrgKey = options.discordBotsOrgKey;
		this.botsOnDiscordKey = options.botsOnDiscordKey;

		this.logger = rLogger ? new rLogger(this, options.logger) : new Logger(options.logger);
		this.chatHandler = rChatHandler ? new rChatHandler(this, options.chatHandler) : new ChatHandler(this, options.chatHandler);
		this.blacklistedGuilds = options.blacklistedGuilds || [];
		this.blacklistedUsers = options.blacklistedUsers || [];
		this.commandPlugins = { };
		this.eventPlugins = { };
		this.middleware = { };

		this.once('ready', () => {
			this.chatHandler.run();
			return this.logger.info('Mirai: Connected to Discord');
		});
		this.on('error', (error, shard) =>
			error && this.logger.error(`Mirai: ${shard !== undefined ? `Shard ${shard} error` : 'Error'}:`, error));
		this.on('disconnected', () => this.logger.warn('Mirai: Disconnected from Discord'));
		this.on('shardReady', shard => this.logger.info(`Mirai: Shard ${shard} ready`));
		this.on('shardDisconnect', (error, shard) => error && this.logger.warn(`Mirai: Shard ${shard} disconnected with error:`, error.message));
		this.on('shardResume', shard => this.logger.info(`Mirai: Shard ${shard} resumed`));

		if (this.blacklistedGuilds.length !== 0) {
			this.on('guildCreate', async guild => {
				if (this.blacklistedGuilds.includes(guild.id)) {
					await guild.leave();
					return this.logger.info('Mirai: Left blacklisted guild', guild.name);
				}
			});
		}

		if (options.gracefulExit === true) {
			process.on('SIGINT', () => {
				this.logger.info('SIGINT detected, shutting down');
				const destroyAll = Object.values(this.commandPlugins).map(p => p.destroy())
					.concat(Object.values(this.eventPlugins).map(p => p.destroy()), Object.values(this.middleware).map(m => m.destroy()));

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
	 * @returns {Promise} The return value of `plugin.load`
	 * @async
	 */
	async loadCommandPlugin(plugin) {
		if (!plugin.name || !!this.commandPlugins[plugin.name])
			throw new Error('Plugin must have a unique name');

		const result = await plugin.load(this);
		this.commandPlugins[plugin.name] = plugin;

		return result;
	}

	/**
	 * Reload a plugin by searching for a plugin with the same name and replacing it
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} The return value of `plugin.load`
	 * @async
	 */
	async reloadCommandPlugin(plugin) {
		if (!plugin.name)
			throw new Error('Plugin must have a name');

		if (!this.commandPlugins[plugin.name])
			throw new Error(`No command plugin with name ${plugin.name} is loaded`);

		await this.commandPlugins[plugin.name].destroy();
		const result = await plugin.load(this);
		this.commandPlugins[plugin.name] = plugin;

		return result;
	}

	/**
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} The return value of `plugin.load`
	 * @async
	 */
	async loadEventPlugin(plugin) {
		if (!plugin.name || !!this.eventPlugins[plugin.name])
			throw new Error('Plugin must have a unique name');

		const result = await plugin.load(this);
		this.eventPlugins[plugin.name] = plugin;

		return result;
	}

	/**
	 * Reload a plugin by searching for a plugin with the same name and replacing it
	 * @param {Function} plugin The plugin to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} The return value of `plugin.load`
	 * @async
	 */
	async reloadEventPlugin(plugin) {
		if (!plugin.name)
			throw new Error('Plugin must have a name');

		if (!this.eventPlugins[plugin.name])
			throw new Error(`No event plugin with name ${plugin.name} is loaded`);

		await this.eventPlugins[plugin.name].destroy();
		const result = await plugin.load(this);
		this.eventPlugins[plugin.name] = plugin;

		return result;
	}

	/**
	 * @param {Function} middleware The middleware to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} The return value of `middleware.load`
	 * @async
	 */
	async loadMiddleware(middleware) {
		if (!middleware.name || !!this.middleware[middleware.name])
			throw new Error('Middleware must have a unique name');

		const result = await middleware.load(this);
		this.middleware[middleware.name] = middleware;

		return result;
	}

	/**
	 * Reload middleware by searching for middleware with the same name and replacing it
	 * @param {Function} middleware The middleware to load. Must have a `load` method which is passed `this`
	 * @returns {Promise} The return value of `middleware.load`
	 * @async
	 */
	async reloadMiddleware(middleware) {
		if (!middleware.name)
			throw new Error('Middleware must have a name');

		if (!this.middleware[middleware.name])
			throw new Error(`No middleware with name ${middleware.name} is loaded`);

		await this.middleware[middleware.name].destroy();
		const result = await middleware.load(this);
		this.middleware[middleware.name] = middleware;

		return result;
	}

	/**
	 * Updates information on carbonitex.net
	 * @param {String} [key] Carbon API key
	 * @returns {Promise} The axios request result or error
	 * @see {@link https://github.com/mzabriskie/axios/blob/master/README.md#response-schema|Axios response}
	 * @async
	 */
	async updateCarbon(key) {
		try {
			const response = await axios.post('https://www.carbonitex.net/discord/data/botdata.php', {
				key: key || this.carbonBotsKey,
				servercount: this.guilds.size
			});

			this.logger.debug(`Updated carbonitex.net guild count to ${this.guilds.size}. Response: ${response.status}`);
			return response;
		} catch (error) {
			if (error.response)
				this.logger.warn(`Response status ${error.response.status} from carbonitex.net. Data: ${error.response.data}`);
			else
				this.logger.error('Error during axios request:', error.stack);

			return error;
		}
	}

	/**
	 * Updates information on bots.discord.pw
	 * @param {String} [key] bots.discord.pw API key
	 * @returns {Promise} The axios request result or error
	 * @see {@link https://github.com/mzabriskie/axios/blob/master/README.md#response-schema|Axios response}
	 * @async
	 */
	async updateDiscordBots(key) {
		try {
			const response = await axios.post(`https://bots.discord.pw/api/bots/${this.user.id}/stats`, { server_count: this.guilds.size }, {
				headers: { 'Authorization': key || this.discordBotsKey }
			});

			this.logger.debug(`Updated bots.discord.pw guild count to ${this.guilds.size}. Response: ${response.status}`);
			return response;
		} catch (error) {
			if (error.response)
				this.logger.warn(`Response status ${error.response.status} from bots.discord.pw. Data: ${error.response.data}`);
			else
				this.logger.error('Error during axios request:', error.stack);

			return error;
		}
	}

	/**
	 * Updates information on discordbots.org
	 * @param {String} [key] discordbots API key
	 * @returns {Promise} The axios request result or error
	 * @see {@link https://github.com/mzabriskie/axios/blob/master/README.md#response-schema|Axios response}
	 * @async
	 */
	async updateDiscordBotsOrg(key) {
		try {
			const response = await axios.post(`https://discordbots.org/api/bots/${this.user.id}/stats`, { server_count: this.guilds.size }, {
				headers: { 'Authorization': key || this.discordBotsOrgKey }
			});

			this.logger.debug(`Updated discordbots.org guild count to ${this.guilds.size}. Response: ${response.status}`);
			return response;
		} catch (error) {
			if (error.response)
				this.logger.warn(`Response status ${error.response.status} from discordbots.org. Data: ${error.response.data}`);
			else
				this.logger.error('Error during axios request:', error.stack);

			return error;
		}
	}

	/**
	 * Updates information on bots.ondiscord.xyz
	 * @param {String} [key] bots.ondiscord.xyz API key
	 * @returns {Promise} The axios request result or error
	 * @see {@link https://github.com/mzabriskie/axios/blob/master/README.md#response-schema|Axios response}
	 * @async
	 */
	async updateBotsOnDiscord(key) {
		try {
			const response = await axios.post(`https://bots.ondiscord.xyz/bot-api/bots/${this.user.id}/guilds`, { guildCount: this.guilds.size }, {
				headers: { 'Authorization': key || this.botsOnDiscordKey }
			});

			this.logger.debug(`Updated bots.ondiscord.xyz guild count to ${this.guilds.size}. Response: ${response.status}`);
			return response;
		} catch (error) {
			if (error.response)
				this.logger.warn(`Response status ${error.response.status} from bots.ondiscord.xyz. Data: ${error.response.data}`);
			else
				this.logger.error('Error during axios request:', error.stack);

			return error;
		}
	}

	/**
	 * Sets the bot's avatar from a url
	 * @param {String} url A direct link to an image
	 * @returns {Promise} Resolves on completion
	 * @async
	 */
	async setAvatar(url) {
		try {
			const response = await axios.get(url, {
				headers: { 'Accept': 'image/*' },
				responseType: 'arraybuffer'
			});

			await this.editSelf({avatar: `data:${response.headers['content-type']};base64,${response.data.toString('base64')}`});

			return this.logger.debug('Updated avatar from ' + url);
		} catch (error) {
			if (error.response)
				this.logger.warn('Failed to fetch avatar:', error.response.data || error.response.status);
			else
				this.logger.warn('Failed to update avatar from ' + url, error);

			throw error;
		}
	}

	/**
	 * Resolve a name or ID to a user
	 * @param {String} query The name or ID to match
	 * @returns {User?} The user the was found
	 * @see {@link https://abal.moe/Eris/docs/User|Eris.User}
	 */
	findUser(query) {
		query = query.toLowerCase().trim();

		if (/^[0-9]{16,19}$/.test(query)) { // If query looks like an ID try to get by ID
			const user = this.users.get(query);
			if (user)
				return user;
		}

		let result = this.users.find(user => user.username.toLowerCase() === query);
		if (!result)
			result = this.users.find(user => user.username.toLowerCase().includes(query));
		return result || null;
	}

	/**
	 * Resolve a name or ID to a guild member
	 * @param {String} query The name or ID to match
	 * @param {Collection} members The Collection of guild members
	 * @returns {Member?} The member the was found
	 * @see {@link https://abal.moe/Eris/docs/Member|Eris.Member}
	 */
	findMember(query, members) {
		query = query.toLowerCase().trim();

		if (/^[0-9]{16,19}$/.test(query)) { // If query looks like an ID try to get by ID
			const member = members.get(query);
			if (member)
				return member;
		}

		let result = members.find(member => member.user.username.toLowerCase() === query);
		if (!result) result = members.find(member => member.nick && member.nick.toLowerCase() === query);
		if (!result) result = members.find(member => member.user.username.toLowerCase().includes(query));
		if (!result) result = members.find(member => member.nick && member.nick.toLowerCase().includes(query));
		return result || null;
	}
}

module.exports = Bot;
