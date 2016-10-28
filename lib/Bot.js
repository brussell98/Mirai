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

class Bot extends EventEmitter {
	constructor(config) {
		super();

		config = config || {};
		this.carbonBotsKey = config.carbonBotsKey;
		this.discordBotsKey = config.discordBotsKey;

		this.logger = new Logger();
		this.client = new Eris(config.token, config.erisOptions);
		this.chatHandler = new ChatHandler(this.client, config.chatHandler);
		this.commandPlugins = [];
		this.eventPlugins = [];
		this.middleware = [];

		this.client.on('ready', () => {
			this.chatHandler.run();
			this.logger.info();
			this.emit('ready');
		});

		this.client.on('error', (error, shard) => {
			this.logger.error();
			this.emit('error', error, shard)
		});

		this.client.on('disconnected', () => {
			this.logger.error();
			this.emit('disconnected');
		});

		this.client.on('shardReady', shard => {
			this.logger.info();
			this.emit('shardReady', shard);
		});

		this.client.on('shardDisconnect', (error, shard) => {
			this.logger.info();
			this.emit('shardDisconnect', error, shard);
		});

		this.client.on('shardResume', shard => {
			this.logger.info();
			this.emit('shardResume', shard);
		});
	}

	run() {
		this.client.connect().catch(error => {
			this.emit('error', error);
		});
	}

	loadCommandPlugin(plugin) {
		if (typeof plugin === 'function')
			return plugin.load(this).then(() => {
				this.commandPlugins.push(plugin);
			});
		return Promise.reject('You must pass a class to loadCommandPlugin');
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

	loadEventPlugin(plugin) {
		if (typeof plugin === 'function')
			return plugin.load(this).then(() => {
				this.eventPlugins.push(plugin);
			});
		return Promise.reject('You must pass a class to loadEventPlugin');
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
		if (typeof middleware === 'function')
			return middleware.load(this).then(() => {
				this.middleware.push(middleware);
			});
		return Promise.reject('You must pass a class to loadMiddleware');
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
						this.logger.debug();
						resolve(response);
					} else {
						this.logger.debug();
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
						this.logger.debug();
						resolve(response);
					} else {
						this.logger.debug();
						reject(response);
					}
				});
		});
	}
}

module.exports = Bot;
