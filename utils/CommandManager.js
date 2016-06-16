var reload	= require('require-reload')(require),
	fs		= require('fs'),
	Command	= reload('./Command.js');

module.exports = class CommandManager {
	/*
	 * prefix: prefix for the commands handled by this.
	 * dir: path to load commands from from the root directory of the bot.
	 */
	constructor(prefix, dir = 'commands/normal/', color) {
		console.log(`${cDebug(' COMMAND MANAGER ')} Set prefix to ${prefix}`);
		this.prefix = prefix;
		this.directory = `${__dirname}/../${dir}`;
		this.color = color || false;
		if (color !== false) console.log(`${cDebug(' COLOR DEBUG ')} ${color(dir)}`);
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
				else if (!files) reject(`No files in directory ${this.directory}`);
				else {
					for (let name of files) {
						if (name.endsWith('.js'))
							try {
								console.log(`${cDebug(' COMMAND MANAGER ')} Added ${name}`);
								this.commands[name.replace(/\.js$/, '')] = new Command(name.replace(/\.js$/, ''), this.prefix, reload(this.directory + name));
							} catch (e) {
								console.error(`Error loading command ${name}: ${e}`);
							}
					}
					resolve();
				}
			});
		});
	}

	/*
	 * Called when a message is detected with the prefix. Decides what to do
	 * msg: The matching message
	 * config: The JSON formatted config file
	*/
	processCommand(bot, msg, config) {
		let name = msg.content.replace(this.prefix, '').split(' ')[0].toLowerCase();
		if (name === "help")
			return this.help(bot, msg, msg.content.replace(this.prefix + name, '').trim());
		let command = this.checkForMatch(name);
		if (command !== false) {
			console.log(`${cDebug(' COMMAND MANAGER ')} Message matched Command ${command.name}`);
			// TODO: LOG
			let suffix = msg.content.replace(this.prefix + name, '').trim();
			return command.execute(bot, msg, suffix, config);
		}
	}

	//Checks if the name matches a command, returns that command or false
	checkForMatch(name) {
		console.log(`${cDebug(' COMMAND MANAGER ')} Checking for a command matching '${name}'`);
		if (name.startsWith(this.prefix)) //Trim prefix off
			name = name.substr(1);
		for (let key in this.commands) {
			if (key === name || this.commands[key].aliases.includes(name))
				return this.commands[key];
		}
		return false;
	}

	/*
	 * Built-in help command
	 * If no command is specified it will DM a list of commands.
	 * If a command is specified it will send info on that command
	*/
	help(bot, msg, command) {
		if (!command) {
			console.log(`${cDebug(' COMMAND MANAGER HELP ')} Sending help message`);
			let messageQueue = [];
			let currentMessage = `\n# Here's a list of my commands. For more info do: ${this.prefix}help <command>`;
			for (let cmd in this.commands) {
				let toAdd = this.commands[cmd].helpShort;
				if (currentMessage.length + toAdd.length >= 1900) { //If too long push to queue and reset it.
					messageQueue.push(currentMessage);
					currentMessage = '';
				}
				currentMessage += '\n' + toAdd;
			}
			messageQueue.push(currentMessage);
			let sendInOrder = setInterval(() => { //eslint-disable-line no-unused-vars
				if (messageQueue.length > 0)
					bot.sendMessage(msg.author, '```glsl' + messageQueue.shift() + '```'); //If still messages queued send the next one.
				else clearInterval(sendInOrder);
			}, 300);

		} else {
			let cmd = this.checkForMatch(command);
			console.log(`${cDebug(' COMMAND MANAGER HELP ')} Getting help for command ${command}`);
			if (cmd === false) //If no matching command
				bot.sendMessage(msg, `Command \`${this.prefix}${command}\` not found`);
			else
				bot.sendMessage(msg, cmd.helpMessage);
		}
	}
};
