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
		this.chatHandler = new ChatHandler(this.client);
		this.commandPlugins = [];
		this.eventPlugins = [];
		this.miscPlugins = [];
	}

	run() {
		this.client.once('ready', () => {
			this.chatHandler.run();
			this.emit('ready');
		})
		this.client.connect().catch(error => {
			this.emit('error', error);
		});
	}

	registerCommandPlugin(path) {
		this.commandPlugins.push(new (require(path))(this));
	}

	registerEventPlugin(path) {
		this.eventPlugins.push(new (require(path))(this));
	}

	registerMiscPlugin(path) {
		this.miscPlugins.push(new (require(path))(this));
	}

	updateCarbon(key) {
		request.post('https://www.carbonitex.net/discord/data/botdata.php')
			.type('application/json')
			.send({
				key: key || this.carbonBotsKey,
				servercount: this.client.guilds.size
			})
			.end(response => {
				if (response.ok)
					this.logger.placeholder();
				else
					this.logger.placeholder();
			});
	}

	updateDiscordBots(key) {
		request.post(`https://bots.discord.pw/api/bots/${this.client.user.id}/stats`)
			.header('Authorization', key || this.discordBotsKey)
			.type('application/json')
			.send({server_count: this.client.guilds.size})
			.end(response => {
				if (response.ok)
					this.logger.placeholder();
				else
					this.logger.placeholder();
			});
	}
}

module.exports = Bot;
