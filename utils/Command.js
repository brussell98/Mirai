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
};
