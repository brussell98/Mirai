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

		this.commands = {};
	}

	/**
	 * An array containing, in this order: name, description, array of command names, array of command descriptions
	 * @type {String}
	 * @abstract
	 */
	get help() {
		return [this.name, this.description, Object.keys(this.commands), Object.keys(this.commands).map(cmd => this.commands[cmd].description)];
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
	 * A description of the plugin
	 * @type {String}
	 * @abstract
	 */
	get description() {
		return '';
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
