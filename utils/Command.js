module.exports = class Command {
	/*
	 * Name: Name of the command.
	 * Prefix: This prefix for the command.
	 * Cmd: Object containing the appropriate properties including the function to run.
	*/
	constructor(name, prefix, cmd) {
		this.name = name;
		this.prefix = prefix;
		this.usage = cmd.usage || "";
		this.desc = cmd.desc || "No description";
		this.help = cmd.help || cmd.desc || this.desc;
		this.task = cmd.task;
		this.aliases = cmd.aliases || [];
		this.cooldown = cmd.cooldown || 0;
		this.defaultDisabled = cmd.defaultDisabled || false;
		this.timesUsed = 0;
		this.usersOnCooldown = {};
	}

	//For telling a user the correct way to use something
	get correctUsage() {
		return `${this.prefix}${this.name} ${this.usage}`;
	}

	//For use in the command list DM.
	get helpShort() {
		return `${this.prefix}${this.name} ${this.usage}\n\t# ${this.desc}`;
	}

	//Sent in response to the help command.
	get helpMessage() {
		return `**❯ Command:** \`${this.prefix}${this.name} ${this.usage}\`
**❯ Info:**\n${this.help}
**❯ Cooldown:** ${this.cooldown} seconds
**❯ Aliases:** ${this.aliases.join(', ') || "None"}`;
	}

	/*
	 * Execute the command
	 * bot: The client
	 * msg: The message that triggered it
	 * suffix: The text after the command (args)
	 * config: The config file
	 * Should return "wrong usage" if used wrong
	*/
	execute(bot, msg, suffix, config) {
		if (this.usersOnCooldown.hasOwnProperty(msg.author.id)) { //if the user is still on cooldown
			console.log(`${cDebug(' COMMAND ')} User on cooldown list`);
			bot.sendMessage(msg, `${msg.author.username}, this command can only be used every ${this.cooldown} seconds.`, (e, m) => bot.deleteMessage(m, {wait: 6000}));
			bot.deleteMessage(msg, {wait: 6000});

		} else {
			let result;
			this.timesUsed++;
			try {
				result = this.task(bot, msg, suffix, config); //run the command
			} catch (err) {
				console.log(`${cError(' COMMAND EXECUTION ERROR ')} ${err}`);
				if (config.errorMessage) bot.sendMessage(msg, config.errorMessage);
			}

			if (result === 'wrong usage') {
				console.log(`${cDebug(' COMMAND ')} Command used wrong`);
				bot.sendMessage(msg, `${msg.author.username}, try again using the following format:\n**\`${this.prefix}${this.name} ${this.usage}\`**`, (e, m) => bot.deleteMessage(m, {wait: 10000}));
				bot.deleteMessage(msg, {wait: 10000});
			} else {
				this.usersOnCooldown[msg.author.id] = '';
				setTimeout(() => { //add the user to the cooldown list and remove them after {cooldown} seconds
					delete this.usersOnCooldown[msg.author.id];
				}, this.cooldown * 1000);
			}
		}
	}
};
