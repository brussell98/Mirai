/**
 * Handles events emitted from eris
 * @abstract
 */
class AbstractEventPlugin {
	/**
	 * Creates a new AbstractEventPlugin
	 * @abstract
	 */
	constructor() {
		if (this.constructor === AbstractEventPlugin)
			throw new Error("Can't instantiate an abstract class!");
	}

	/**
	 * The name of the plugin
	 * @type {String}
	 * @abstract
	 */
	get name() {
		throw new Error('name must be overwritten');
	}

	/**
	 * Loads the plugin
	 * @param {Bot} bot The main client
	 * @returns {Promise} Resolves with `this`
	 */
	load(bot) {
		this.logger = bot.logger;
		this.bot = bot;
		return Promise.resolve(this);
	}

	/**
	 * Destroys/unloads the plugin
	 * @returns {Promise} Resolves with no value
	 */
	destroy() {
		this.logger = undefined;
		this.bot = undefined;
		return Promise.resolve();
	}
}

module.exports = AbstractEventPlugin;
