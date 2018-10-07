/* eslint-disable require-jsdoc */

// Middleware example
// Allows plugins to access a Mongo database
// Includes caching with options.mUseCache to reduce delay

const Mongoose = require('mongoose');
const Schema = Mongoose.Schema;

var exampleSchema = new Schema({
	id: String,
	uses: { type: Number }
}, { collection: 'guildSettings' });

class MongoDBMiddleware {
	constructor(options = { URI: 'mongodb://admin:pass@localhost:27017/example' }) {
		this.URI = options.URI;
		this.models = { examples: Mongoose.model('examples', exampleSchema) };
		this.cache = { examples: { } };
	}

	get name() {
		return 'MongoDatabase';
	}

	load(bot) {
		return new Promise(resolve => {
			this.bot = bot;
			Mongoose.Promise = global.Promise;
			Mongoose.connect(this.URI, { useNewUrlParser: true });
			Mongoose.connection.on('error', this.bot.logger.error.bind(this.bot.logger, 'Mongoose error:'));
			Mongoose.connection.once('open', () => this.bot.logger.info('Mongoose Connected'));
			Mongoose.set('useCreateIndex', true);
			return resolve(this);
		});
	}

	destroy() {
		return new Promise(resolve => {
			this.bot = undefined;
			Mongoose.disconnect();
			Mongoose.connection.removeAllListeners('error');
			Mongoose.connection.removeAllListeners('open');
			return resolve();
		});
	}

	invalidate(collection, id) {
		if (this.cache.hasOwnProperty(collection) && this.cache[collection].hasOwnProperty(id))
			delete this.cache[collection][id];
	}

	findOne(collection, conditions, projection, options = {}) {
		if (options.mUseCache === true && options.lean === true && !projection) {
			if (this.cache[collection].hasOwnProperty(conditions.id))
				return Promise.resolve(this.cache[collection][conditions.id]);

			return this.models[collection].findOne(conditions, projection, options).then(resp => {
				this.cache[collection][conditions.id] = resp;
				return resp;
			});
		}
		return this.models[collection].findOne(conditions, projection, options);
	}

	update(collection, conditions, doc, options) {
		if (conditions.hasOwnProperty('id'))
			this.invalidate(collection, conditions.id);

		return this.models[collection].updateOne(conditions, doc, options);
	}

	remove(collection, conditions) {
		if (conditions.hasOwnProperty('id'))
			this.invalidate(collection, conditions.id);

		return this.models[collection].deleteOne(conditions);
	}
}

module.exports = MongoDBMiddleware;
