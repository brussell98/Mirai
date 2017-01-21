const chalk = new (require('chalk')).constructor({enabled: true});

/**
 * Displays text to the console. Also supports sentry
 * @prop {RavenClient} raven The Raven client used for sentry, if enabled.
 */
class Logger {
	/**
	 * Creates a new Logger
	 * @param {Object} [options] The configuration for the logger
	 * @param {Boolean} [options.timestamps=false] Add a timestamp to each message logged
	 * @param {Object} [options.levels] An object deciding what log levels should display
	 * @param {Boolean} [options.levels.log=true] Show `log()`
	 * @param {Boolean} [options.levels.info=true] Show `info()`
	 * @param {Boolean} [options.levels.debug=false] Show `debug()`
	 * @param {Boolean} [options.levels.warning=true] Show `warn()`
	 * @param {Boolean} [options.levels.error=true] Show `error()`
	 * @param {Object} [options.raven] Raven options. If falsy, raven will not be required.
	 * @param {String} options.raven.url Your project's sentry.io url
	 * @param {Object} [options.raven.config] A custom raven config. For more info check {@link https://docs.sentry.io/clients/node/config/|their docs}
	 * @param {Boolean} [options.raven.info=false] Send `info()` messages to sentry
	 * @param {Boolean} [options.raven.debug=false] Send `debug()` messages to sentry
	 * @param {Boolean} [options.raven.warning=false] Send `warn()` messages to sentry. If an {@link Error} is passed in the arguments, that will be sent alone.
	 * @param {Boolean} [options.raven.error=true] Send `error()` errors to sentry. If an {@link Error} is passed in the arguments, that will be sent alone.
	 */
	constructor(options = {}) {
		this.timestamps = !!options.timestamps;
		this.levels = {
			'log':     options.levels && options.levels.log !== undefined     ? options.levels.log     : true,
			'info':    options.levels && options.levels.info !== undefined    ? options.levels.info    : true,
			'debug':   options.levels && options.levels.debug !== undefined   ? options.levels.debug   : false,
			'warning': options.levels && options.levels.warning !== undefined ? options.levels.warning : true,
			'error':   options.levels && options.levels.error !== undefined   ? options.levels.error   : true
		}

		if (options.raven) {
			this.raven = require('raven');
			this.raven.disableConsoleAlerts();
			this.raven.config(options.raven.url, options.raven.config || {
				release: (require('./package.json')).version,
				autoBreadcrumbs: { 'http': true },
				captureUnhandledRejections: true
			}).install();

			this.ravenLevels = {
				'info':    options.raven.info !== undefined    ? options.raven.info    : false,
				'debug':   options.raven.debug !== undefined   ? options.raven.debug   : false,
				'warning': options.raven.warning !== undefined ? options.raven.warning : false,
				'error':   options.raven.error !== undefined   ? options.raven.error   : true
			}
		}
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
		if (this.levels.log)
			console.log(this.timestamp + Array.prototype.join.call(arguments, ' '));
	}

	/** Log informal text */
	info() {
		if (this.levels.info)
			console.info(this.timestamp + chalk.cyan(...arguments));

		if (this.ravenLevels && this.ravenLevels.info)
			this.raven.captureMessage(Array.prototype.join.call(arguments, ' '), { level: 'info' });
	}

	/** Log debugging information */
	debug() {
		if (this.levels.debug)
			console.log(this.timestamp + chalk.gray(...arguments));

		if (this.ravenLevels && this.ravenLevels.debug)
			this.raven.captureMessage(Array.prototype.join.call(arguments, ' '), { level: 'debug' });
	}

	/** Log a warning */
	warn() {
		if (this.levels.warning)
			console.warn(this.timestamp + chalk.yellow(...arguments));

		if (this.ravenLevels && this.ravenLevels.warning) {
			let error = Array.prototype.find.call(arguments, a => a instanceof Error) || Array.prototype.join.call(arguments, ' ');
			this.raven.captureMessage(error, { level: 'warning' });
		}
	}

	/** Log an error */
	error() {
		if (this.levels.error)
			console.error(this.timestamp + chalk.red([...arguments].map(e => e instanceof Error ? e.stack : e).join(' ')));

		if (this.ravenLevels && this.ravenLevels.error) {
			let error = Array.prototype.find.call(arguments, a => a instanceof Error) || Array.prototype.join.call(arguments, ' ');
			this.raven.captureException(error);
		}
	}
}

module.exports = Logger;
