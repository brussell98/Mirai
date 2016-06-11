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
		this.desc = cmd.desc || "";
		this.help = cmd.help || cmd.desc || "";
		this.task = cmd.task;
		this.aliases = cmd.aliases || [];
		this.cooldown = cmd.cooldown || 0;
		this.defaultDisabled = cmd.defaultDisabled || false;
		this.timesUsed = 0;
		this.usersOnCooldown = {};
	}

	//For use in the command list DM.
	get helpShort() {
		return `${this.prefix}${this.name} ${this.usage}\n\t#${this.desc}`;
	}

	//Sent in response to the help command.
	get help() {
		return `Nothing can save you`; // TODO: Make this
	}

	//Run the command
	execute(bot, msg, suffix) {
		if (this.usersOnCooldown.hasOwnProperty(msg.author.id)) { //if the user is still on cooldown
			bot.sendMessage(msg, `${msg.author.username}, this command can only be used every ${this.cooldown} seconds.`, (e, m) => bot.deleteMessage(m, {wait: 6000}));
			bot.deleteMessage(msg, {wait: 6000});

		} else {
			let result;
			this.timesUsed++;
			try {
				result = this.task(bot, msg, suffix); //run the command
			} catch (err) {
				console.log(`${cError(' COMMAND EXECUTION ERROR ')} ${err}`);
			}

			if (result === 'wrong usage') {
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
