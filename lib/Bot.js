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
		this.miscPlugins = [];

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
		if (typeof plugin === 'string')
			this.commandPlugins.push(new (require(plugin))(this));
		else {
			plugin.load(this);
			this.commandPlugins.push(plugin);
		}
	}

	loadEventPlugin(plugin) {
		if (typeof plugin === 'string')
			this.eventPlugins.push(new (require(plugin))(this));
		else {
			plugin.load(this);
			this.eventPlugins.push(plugin);
		}
	}

	loadMiscPlugin(plugin) {
		if (typeof plugin === 'string')
			this.miscPlugins.push(new (require(plugin))(this));
		else {
			plugin.load(this);
			this.miscPlugins.push(plugin);
		}
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
