var reload  = require('require-reload')(require),
	fs      = require('fs'),
	Command = reload('./Command.js'),
	_Logger = reload('./Logger.js');

/**
* @class
* @classdesc Handles a directory of .js files formatted as {@link Command}.
* @prop {String} prefix Prefix for the commands handled by this CommandManager.
* @prop {String} dir Path where the commands are located from the root directory.
* @prop {Object<Command>} commands The loaded {@link Command}s.
*/
class CommandManager {

	/**
	* @constructor
	* @arg {Object} config The bot's config settings.
	* @arg {String} prefix Prefix for the commands handled by this CommandManager.
	* @arg {String} [dir="commands/normal/"] Path to load commands from, from the root directory of the bot.
	* @arg {String} [color] The color to log commands with.
	*/
	constructor(config, prefix, dir = 'commands/normal/', color) {
		this.prefix = prefix;
		this.directory = `${__dirname}/../${dir}`;
		this.commands = {};
		this.fallbackCommands = [];
		this.logger = new _Logger(config.logTimestamp, color);
	}

	/**
	* Initialize the command manager, loading each command in the set directory.
	* @arg {Client} bot
	* @arg {Object} config The bot's config settings.
	* @arg {settingsManager} settingsManager The bot's {@link settingsManager}.
	* @returns {Promise}
	*/
	initialize(bot, config, settingsManager) {
		return new Promise((resolve, reject) => {
			fs.readdir(this.directory, (err, files) => {
				if (err) reject(`Error reading commands directory: ${err}`);
				else if (!files) reject(`No files in directory ${this.directory}`);
				else {
					settingsManager.commandList[this.prefix] = [];
					for (let name of files) {
						if (name.endsWith('.js')) {
							try {
								name = name.replace(/\.js$/, '');
								let command = new Command(name, this.prefix, reload(this.directory + name + '.js'), bot, config);
								this.commands[name] = command;
								settingsManager.commandList[this.prefix].push(name);
								if (command.fallback) {
									this.fallbackCommands.push(command);
								}
							} catch (e) {
								this.logger.error(`${e}\n${e.stack}`, 'Error loading command ' + name);
							}
						}
					}
					resolve();
				}
			});
		});
	}

	/**
	* Called when a message is detected with the prefix. Decides what to do.
	* @arg {Eris} bot The client.
	* @arg {Eris.Message} msg The matching message.
	* @arg {Object} config The JSON formatted config file.
	* @arg {settingsManager} settingsManager The bot's {@link settingsManager}.
	*/
	processCommand(bot, msg, config, settingsManager) {
		let name = msg.content.replace(this.prefix, '').split(/ |\n/)[0];
		let command = this.checkForMatch(name.toLowerCase());
		let suffix = msg.content.replace(this.prefix + name, '').trim();
		if (command !== null) {
			if (msg.channel.guild !== undefined && !msg.channel.permissionsOf(msg.author.id).has('manageChannels') && settingsManager.isCommandIgnored(this.prefix, command.name, msg.channel.guild.id, msg.channel.id, msg.author.id) === true)
				return;
			this.logCommand(msg, command.name, name);
			return command.execute(bot, msg, suffix, config, settingsManager, this.logger);
		} else if (name.toLowerCase() === "help") {
			return this.help(bot, msg, msg.content.replace(this.prefix + name, '').trim());
		} else if (this.fallbackCommands.length > 0) {
			this.logCommand(msg, name, name);
			let commandResults = [];
			for (let i = 0; i < this.fallbackCommands.length; ++i) {
				let command = this.fallbackCommands[i];
				commandResults.push(command.execute(bot, msg, suffix, config, settingsManager, this.logger));
			}

			return commandResults;
		}
	}

	/**
	* Logs a command
	* @arg {Eris.Message} msg The message containing the command to log.
	* @arg {String} commandNameToLog The command name that should appear in the log.
	* @arg {String} commandNameEntered The actual command name that the user typed and which is contained in msg.
	*/
	logCommand(msg, commandNameToLog, commandNameEntered) {
		this.logger.logCommand(msg.channel.guild === undefined ? null : msg.channel.guild.name, msg.author.username, this.prefix + commandNameToLog, msg.cleanContent.replace(this.prefix + commandNameEntered, '').trim());
	}

	/**
	* Checks if there is a matching command in this CommandManager.
	* @arg {String} name The command name to look for.
	* @return {?Command} Returns the matching {@link Command} or false.
	*/
	checkForMatch(name) {
		if (name.startsWith(this.prefix)) //Trim prefix off
			name = name.substr(1);
		for (let key in this.commands) {
			if (key === name || this.commands[key].aliases.includes(name))
				return this.commands[key];
		}
		return null;
	}

	/**
	* Built-in help command
	* If no command is specified it will DM a list of commands.
	* If a command is specified it will send info on that command
	* @arg {Eris} bot The client.
	* @arg {Eris.Message} msg The message that triggered the command.
	* @arg {String} [command] The command to get help for.
	*/
	help(bot, msg, command) {
		this.logger.logCommand(msg.channel.guild === undefined ? null : msg.channel.guild.name, msg.author.username, this.prefix + 'help', command);
		if (!command) {
			let messageQueue = [];
			let currentMessage = `\n// Here's a list of my commands. For more info do: ${this.prefix}help <command>`;
			for (let cmd in this.commands) {
				if (this.commands[cmd].hidden === true)
					continue;
				let toAdd = this.commands[cmd].helpShort;
				if (currentMessage.length + toAdd.length >= 1900) { //If too long push to queue and reset it.
					messageQueue.push(currentMessage);
					currentMessage = '';
				}
				currentMessage += '\n' + toAdd;
			}
			messageQueue.push(currentMessage);
			bot.getDMChannel(msg.author.id).then(chan => {
				let sendInOrder = setInterval(() => { //eslint-disable-line no-unused-vars
					if (messageQueue.length > 0)
						bot.createMessage(chan.id, '```glsl' + messageQueue.shift() + '```'); //If still messages queued send the next one.
					else clearInterval(sendInOrder);
				}, 300);
			});

		} else {
			let cmd = this.checkForMatch(command);
			if (cmd === null) //If no matching command
				bot.createMessage(msg.channel.id, `Command \`${this.prefix}${command}\` not found`);
			else
				bot.createMessage(msg.channel.id, cmd.helpMessage);
		}
	}

	/**
	* Reload or load a command.
	* @arg {Client} bot The Client.
	* @arg {String} channelId The channel to respond in.
	* @arg {String} command The comamnd to reload or load.
	* @arg {Object} config The bot's config.
	* @arg {settingsManager} settingsManager The bot's {@link settingsManager}.
	*/
	reload(bot, channelId, command, config, settingsManager) {
		fs.access(`${this.directory}${command}.js`, fs.R_OK | fs.F_OK, error => {
			if (error)
				bot.createMessage(channelId, 'Command does not exist');
			else {
				try {
					if (this.commands.hasOwnProperty(command))
						this.commands[command].destroy();
					this.commands[command] = new Command(command, this.prefix, reload(`${this.directory}${command}.js`), config, bot);
					bot.createMessage(channelId, `Command ${this.prefix}${command} loaded`);
					if (!settingsManager.commandList[this.prefix].includes(command))
						settingsManager.commandList[this.prefix].push(command);
				} catch (error) {
					this.logger.error(error, 'Error reloading command ' + command);
					bot.createMessage(channelId, `Error loading command: ${error}`);
				}
			}
		});
	}
}

module.exports = CommandManager;
