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
