var reload	= require('require-reload')(require),
	fs = require('fs'),
	Command = reload('./Command.js');

module.exports = class CommandManager {
	/*
	 * prefix: prefix for the commands handled by this.
	 * dir: path to load commands from from the root directory of the bot.
	 */
	constructor(prefix, dir = `${__dirname}/../commands/`) {
		this.prefix = prefix;
		this.directory = dir;
		this.commands = {};
	}

	/*
	 * Initialize the command manager.
	 * Loads each command in the set directory.
	 * Returns a promise.
	*/
	initialize() {
		return new Promise((resolve, reject) => {
			fs.readdir(this.directory, (err, files) => {
				if (err) reject(`Error reading commands directory: ${err}`);
				for (let name of files) {
					if (name.endsWith('.js'))
						try {
							this.commands[name.replace(/\.js$/, '')] = new Command(name.replace(/\.js$/, ''), this.prefix, reload(this.directory + name));
						} catch (e) {
							console.error(`Error loading command ${name}: ${err}`);
						}
				}
				resolve();
			});
		});
	}
};
