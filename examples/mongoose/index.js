/* eslint-disable require-jsdoc */

const Mirai = require('mirai-bot-core'),
	mirai = new Mirai({ /* config here */ }),
	MongoDB = require('./MongoMiddle'),
	AbstractCommandPlugin = require('mirai-bot-core/lib/Base/AbstractCommandPlugin');

global.Promise = require("bluebird");

mirai.connect()
	.then(() => mirai.loadMiddleware(MongoDB))
	.then(() => mirai.loadCommandPlugin(MongoTest))
	.catch(e => mirai.logger.error('Error during setup:', e));

class MongoTest extends AbstractCommandPlugin {
	constructor() {
		super();
		this.prefix = 'mt ';
	}

	get name() {
		return 'mongo test';
	}

	get description() {
		return 'mongo test commands';
	}

	get database() {
		if (!this._databaseIndex)
			this._databaseIndex = this.bot.middleware.findIndex(m => m.name === 'MongoDatabase');
		return this.bot.middleware[this._databaseIndex];
	}

	load(bot) {
		super.load(bot);
		return Promise.resolve(this);
	}

	destroy() {
		super.destroy();
		return Promise.resolve();
	}

	handle(message) {
		if (message.content === this.prefix + 'find') {
			this.database.findOne('examples', { id: message.author.id }, null, { mUseCache: true, lean: true }).then(doc => {
				console.log(doc);
			});
		} else if (message.content === this.prefix + 'create') {
			this.database.models.examples.create({ id: message.author.id, uses: 0 }).then(() => {
				console.log('Created document');
			});
		} else if (message.content === this.prefix + 'update') {
			this.database.update('examples', { id: message.author.id }, { $inc: { uses: 1 } }).then(() => {
				console.log('Increased uses by 1');
			});
		}
	}
}
