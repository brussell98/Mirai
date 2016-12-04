const chalk = new (require('chalk')).constructor({enabled: true});

/** Displays text to the console */
class Logger {
	/**
	 * Creates a new Logger
	 * @param {Object} [options] The configuration for the logger
	 * @param {Boolean} [options.showDebug=false] Display `debug()` in the console
	 * @param {Boolean} [options.onlyErrors=false] Only display `error()` in the console
	 * @param {Boolean} [options.timestamps=false] Add a timestamp to each message logged
	 */
	constructor(options = {}) {
		this.showDebug = !!options.showDebug;
		this.onlyErrors = !!options.onlyErrors;
		this.timestamps = !!options.timestamps
	}

	/**
	 * A formatted timestamp
	 * @type {String}
	 */
	get timestamp() {
		return this.timestamps ? `[${new Date().toLocaleString()}] ` : '';
	}

	/** Log generic text */
	log() {
		if (!this.onlyErrors)
			console.log(this.timestamp + Array.prototype.join.call(arguments, ' '));
	}

	/** Log informal text */
	info() {
		if (!this.onlyErrors)
			console.info(this.timestamp + chalk.cyan(...arguments));
	}

	/** Log debugging information */
	debug() {
		if (this.showDebug)
			console.log(this.timestamp + chalk.gray(...arguments));
	}

	/** Log a warning */
	warn() {
		if (!this.onlyErrors)
			console.warn(this.timestamp + chalk.yellow(...arguments));
	}

	/** Log an error */
	error() {
		console.error(this.timestamp + chalk.red(...arguments));
	}
}

module.exports = Logger;
