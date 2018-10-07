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
		this.logger = bot.logger;
		this.bot = bot;
		return Promise.resolve(this);
	}

	/**
	 * Destroys/unloads the middleware
	 * @returns {Promise} Resolves with no value
	 */
	destroy() {
		this.logger = undefined;
		this.bot = undefined;
		return Promise.resolve();
	}
}

module.exports = AbstractMiddleware;
