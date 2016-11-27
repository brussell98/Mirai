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
 * @extends {@link http://eris.tachibana.erendale.abal.moe/Eris/docs/Client|Eris.Client}
 * @example <caption>Create a new instance of Mirai</caption>
 * const Mirai = require('mirai-bot-discord');
 * var config = require('./config.json');
 * var mirai = new Mirai(config);
 */
class Bot extends Eris.Client {
	constructor(config = {}, rLogger, rChatHandler) {
		super(config.token, config.eris);

		this.carbonBotsKey = config.carbonBotsKey;
		this.discordBotsKey = config.discordBotsKey;

		this.logger = rLogger || new Logger(config.logger);
		this.chatHandler = rChatHandler || new ChatHandler(this, config.chatHandler);
		this.blacklistedGuilds = config.blacklistedGuilds || [];
		this.blacklistedUsers = config.blacklistedUsers || [];
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
	}

	/**
	 * @param {Function} plugin The plugin to load. Must have a load() method which is passed <code>this</code>.
	 * @example <caption>Loading a Command Plugin</caption>
	 * var funCommands = new FunCommandsPlugin();
	 * mirai.loadCommandPlugin(funCommands);
	 * @returns {Promise}
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
	 * @param {Function} plugin The plugin to load. Must have a load() method which is passed <code>this</code>.
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

	updateCarbon(key) {
		return axios.post('https://www.carbonitex.net/discord/data/botdata.php', {
			key: key || this.carbonBotsKey,
			servercount: this.guilds.size
		}).then(response => {
			this.logger.debug('Sent servercount:', this.guilds.size, 'to carbonitex.net. Response:', response.status);
		}).catch(error => {
			if (error.response)
				return this.logger.warn('Error response status', error.response.status, 'from carbonitex.net. Data:', error.response.data);
			this.logger.error('Error during axios request:', error.stack);
		});
	}

	updateDiscordBots(key) {
		return axios.post(`https://bots.discord.pw/api/bots/${this.user.id}/stats`, { server_count: this.guilds.size }, {
			headers: { 'Authorization': key || this.discordBotsKey }
		}).then(response => {
			this.logger.debug('Sent server_count:', this.guilds.size, 'to bots.discord.pw. Response:', response.status);
		}).catch(error => {
			if (error.response)
				return this.logger.warn('Error response status', error.response.status, 'from bots.discord.pw. Data:', error.response.data);
			this.logger.error('Error during axios request:', error.stack);
		});
	}

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
}

module.exports = Bot;
