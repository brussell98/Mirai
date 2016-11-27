const chalk = new (require('chalk')).constructor({enabled: true});

class Logger {
	constructor(options = {}) {
		this.showDebug = !!options.showDebug;
		this.onlyErrors = !!options.onlyErrors;
		this.timestamps = !!options.timestamps
	}

	get timestamp() {
		return this.timestamps ? `[${new Date().toLocaleString()}] ` : '';
	}

	log() {
		if (!this.onlyErrors)
			console.log(this.timestamp + Array.prototype.join.call(arguments, ' '));
	}

	info() {
		if (!this.onlyErrors)
			console.info(this.timestamp + chalk.cyan(...arguments));
	}

	debug() {
		if (this.showDebug)
			console.log(this.timestamp + chalk.gray(...arguments));
	}

	warn() {
		if (!this.onlyErrors)
			console.warn(this.timestamp + chalk.yellow(...arguments));
	}

	error() {
		console.error(this.timestamp + chalk.red(...arguments));
	}
}

module.exports = Logger;
