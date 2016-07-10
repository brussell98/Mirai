/**
* @class
* @classdesc Represents a command for the client.
* @prop {String} name The command's name.
* @prop {String} prefix Prefix for the command.
* @prop {String} [usage=""] Usage for the command.
* @prop {String} [desc="No description"] Short description of what the command does.
* @prop {String} [help="No description"] Detailed description of what the command does.
* @prop {Function} task The function to execute when the command is called.
* @prop {Array<String>} aliases An array containing the aliases for the command.
* @prop {Number} cooldown The colldown for the command in seconds.
* @prop {Boolean} hidden If the command should be hidden from help.
* @prop {Number} timesUsed How many times the command has been used.
* @prop {Object} usersOnCooldown Users that are still on cooldown.
*/
class Command {

	/**
	* @constructor
	* @arg {String} name Name of the command.
	* @arg {String} prefix This prefix for the command.
	* @arg {Object} cmd Object containing the appropriate properties including the function to run.
	* @arg {String} cmd.usage
	* @arg {String} cmd.desc
	* @arg {String} cmd.help
	* @arg {Function} cmd.task
	* @arg {Array<String>} cmd.aliases
	* @arg {Number} cmd.cooldown
	* @arg {Boolean} cmd.hidden
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
		this.hidden = !!cmd.hidden || false;
		this.timesUsed = 0;
		this.usersOnCooldown = {};
	}

	/**
	* For telling a user the correct way to use something
	* @type {String}
	*/
	get correctUsage() {
		return `${this.prefix}${this.name} ${this.usage}`;
	}

	/**
	* For use in the command list DM.
	* @type {String}
	*/
	get helpShort() {
		return `${this.prefix}${this.name} ${this.usage}\n\t# ${this.desc}`;
	}

	/**
	* Sent in response to the help command.
	* @type {String}
	*/
	get helpMessage() {
		return `**❯ Command:** \`${this.prefix}${this.name} ${this.usage}\`
**❯ Info:**\n${this.help}
**❯ Cooldown:** ${this.cooldown} seconds
**❯ Aliases:** ${this.aliases.join(', ') || "None"}`;
	}

	/**
	* Execute the command. If the command returns "wrong usage" will show the {@link Command#correctUsage}
	* @arg {Eris} bot The client.
	* @arg {Eris.Message} msg The message that triggered it.
	* @arg {String} suffix The text after the command (args).
	* @arg {Object} config The config Object.
	* @arg {settingsManager} settingsManager
	*/
	execute(bot, msg, suffix, config, settingsManager) {
		if (this.usersOnCooldown.hasOwnProperty(msg.author.id)) { //if the user is still on cooldown
			bot.createMessage(msg.channel.id, `${msg.author.username}, this command can only be used every ${this.cooldown} seconds.`).then(sentMsg => {
				setTimeout(() => {
					bot.deleteMessage(msg.channel.id, msg.id);
					bot.deleteMessage(sentMsg.channel.id, sentMsg.id);
				}, 6000);
			});

		} else {
			let result;
			this.timesUsed++;
			commandsProcessed++;
			try {
				result = this.task(bot, msg, suffix, config, settingsManager); //run the command
			} catch (err) {
				console.log(`${cError(' COMMAND EXECUTION ERROR ')} ${err}\n${err.stack}`);
				if (config.errorMessage) bot.createMessage(msg.channel.id, config.errorMessage);
			}

			if (result === 'wrong usage') {
				bot.createMessage(msg.channel.id, `${msg.author.username}, try again using the following format:\n**\`${this.prefix}${this.name} ${this.usage}\`**`).then(sentMsg => {
					setTimeout(() => {
						bot.deleteMessage(msg.channel.id, msg.id);
						bot.deleteMessage(sentMsg.channel.id, sentMsg.id);
					}, 10000);
				});
			} else if (!config.adminIds.includes(msg.author.id)) {
				this.usersOnCooldown[msg.author.id] = '';
				setTimeout(() => { //add the user to the cooldown list and remove them after {cooldown} seconds
					delete this.usersOnCooldown[msg.author.id];
				}, this.cooldown * 1000);
			}
		}
	}
}

module.exports = Command;
