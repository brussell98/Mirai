/**
 * A set of commands
 * @abstract
 */
class AbstractCommandPlugin {
	/**
	 * Creates a new AbstractCommandPlugin
	 * @abstract
	 */
	constructor() {
		if (this.constructor === AbstractCommandPlugin)
			throw new Error("Can't instantiate an abstract class!");
	}

	/**
	 * An explantion of the commands
	 * @type {String}
	 * @abstract
	 */
	get help() {
		return;
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
			resolve();
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

	/**
	 * Handle a message
	 * @type {String}
	 * @abstract
	 */
	handle() {
		throw new Error('handle must be overwritten');
	}
}

module.exports = AbstractCommandPlugin;
