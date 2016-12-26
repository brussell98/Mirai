/**
 * Manages external connections to and from the bot
 * @abstract
 */
class AbstractMiddleware {
	/**
	 * Creates a new AbstractMiddleware
	 * @abstract
	 */
	constructor() {
		if (this.constructor === AbstractMiddleware)
			throw new Error("Can't instantiate an abstract class!");
	}

	/**
	 * The name of the middleware
	 * @type {String}
	 * @abstract
	 */
	get name() {
		throw new Error('name must be overwritten');
	}

	/**
	 * Loads the middleware
	 * @param {Bot} bot The main client
	 * @returns {Promise} Resolves with `this`
	 */
	load(bot) {
		return new Promise(resolve => {
			this.logger = bot.logger;
			this.bot = bot;
			resolve(this);
		});
	}

	/**
	 * Destroys/unloads the middleware
	 * @returns {Promise} Resolves with no value
	 */
	destroy() {
		return new Promise(resolve => {
			this.logger = undefined;
			this.bot = undefined;
			resolve();
		});
	}
}

module.exports = AbstractMiddleware;
