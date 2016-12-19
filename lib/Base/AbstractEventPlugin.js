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
		return new Promise(resolve => {
			this.logger = bot.logger;
			this.bot = bot;
			resolve(this);
		});
	}

	/**
	 * Destroys/unloads the plugin
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

module.exports = AbstractEventPlugin;
