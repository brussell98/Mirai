const Logger = require('./Logger.js'),
	ChatHandler = require('./ChatHandler.js'),
	Eris = require('eris'),
	request = require('unirest');

var EventEmitter, Promise;
try {
	EventEmitter = require("eventemitter3");
} catch(err) {
	EventEmitter = require("events").EventEmitter;
}
try {
	Promise = require("bluebird");
} catch(err) {
	Promise = global.Promise;
}

/**
 * Manages the connection to Discord and interaction between plugins
 * @extends EventEmitter
 * @example <caption>Create a new instance of Mirai</caption>
 * const Mirai = require('mirai-bot-discord');
 * var config = require('./config.json');
 * var mirai = new Mirai(config);
 */
class Bot extends EventEmitter {
	constructor(config) {
		super();

		config = config || {};
		this.carbonBotsKey = config.carbonBotsKey;
		this.discordBotsKey = config.discordBotsKey;

		this.logger = new Logger();
		this.client = new Eris(config.token, config.erisOptions);
		this.chatHandler = new ChatHandler(this, config.chatHandler);
		this.blacklistedGuilds = config.blacklistedGuilds || [];
		this.blacklistedUsers = config.blacklistedUsers || [];
		this.commandPlugins = [];
		this.eventPlugins = [];
		this.middleware = [];

		this.client.on('ready', () => {
			this.chatHandler.run();
			this.logger.info('ready'); // TODO
			this.emit('ready');
		});

		this.client.on('error', (error, shard) => {
			this.logger.error('error', error); // TODO
			this.emit('error', error, shard)
		});

		this.client.on('disconnected', () => {
			this.logger.error('disconnected'); // TODO
			this.emit('disconnected');
		});

		this.client.on('shardReady', shard => {
			this.logger.info('shard', shard, 'ready'); // TODO
			this.emit('shardReady', shard);
		});

		this.client.on('shardDisconnect', (error, shard) => {
			this.logger.warn('shard', shard, 'disconnected'); // TODO
			this.emit('shardDisconnect', error, shard);
		});

		this.client.on('shardResume', shard => {
			this.logger.info('shard', shard, 'resumed'); // TODO
			this.emit('shardResume', shard);
		});

		if (this.blacklistedGuilds.length !== 0) {
			this.client.on('guildCreate', guild => {
				if (this.blacklistedGuilds.includes(guild.id)) {
					guild.leave();
					this.logger.info('left', guild.name); // TODO
				}
			});
		}
	}

	/** Runs the bot, connecting to Discord */
	run() {
		this.client.connect().catch(error => {
			this.emit('error', error);
		});
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
		return new Promise((resolve, reject) => {
			request.post('https://www.carbonitex.net/discord/data/botdata.php')
				.type('application/json')
				.send({
					key: key || this.carbonBotsKey,
					servercount: this.client.guilds.size
				})
				.end(response => {
					if (response.ok) {
						this.logger.debug(); // TODO
						resolve(response);
					} else {
						this.logger.warn(); // TODO
						reject(response);
					}
				});
		});
	}

	updateDiscordBots(key) {
		return new Promise((resolve, reject) => {
			request.post(`https://bots.discord.pw/api/bots/${this.client.user.id}/stats`)
				.header('Authorization', key || this.discordBotsKey)
				.type('application/json')
				.send({server_count: this.client.guilds.size})
				.end(response => {
					if (response.ok) {
						this.logger.debug(); // TODO
						resolve(response);
					} else {
						this.logger.warn(); // TODO
						reject(response);
					}
				});
		});
	}
}

module.exports = Bot;
