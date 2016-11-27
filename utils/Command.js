/**
* @class
* @classdesc Represents a command for the client.
* @prop {String} name The command's name.
* @prop {String} prefix Prefix for the command.
* @prop {String} usage Usage for the command.
* @prop {String} desc Short description of what the command does.
* @prop {String} help Detailed description of what the command does.
* @prop {Function} task The function to execute when the command is called.
* @prop {Array<String>} aliases An array containing the aliases for the command.
* @prop {Number} cooldown The colldown for the command in seconds.
* @prop {Boolean} hidden If the command should be hidden from help.
* @prop {Boolean} ownerOnly If the command can only be used by a bot admin.
* @prop {Boolean} guildOnly If the command can only be used in a guild.
* @prop {Boolean} fallback If this command should be executed when there are no other matching commands.
* @prop {String} requiredPermission The permission needed to use the command.
* @prop {Number} timesUsed How many times the command has been used.
* @prop {Set} usersOnCooldown Users that are still on cooldown.
* @prop {Function} destroyFunction A function that runs at destruction.
*/
class Command {

	/**
	* @constructor
	* @arg {String} name Name of the command.
	* @arg {String} prefix This prefix for the command.
	* @arg {Object} cmd Object containing the appropriate properties including the function to run.
	* @arg {String} [cmd.usage=""]
	* @arg {String} [cmd.desc="No description"]
	* @arg {String} [cmd.help=""No description""]
	* @arg {Function} cmd.task
	* @arg {Array<String>} [cmd.aliases=[]]
	* @arg {Number} [cmd.cooldown=0]
	* @arg {Boolean} [cmd.hidden=false]
	* @arg {Boolean} [cmd.ownerOnly=false]
	* @arg {Boolean} [cmd.guildOnly=false]
	* @arg {Boolean} [cmd.fallback=false]
	* @arg {String} [cmd.requiredPermission=null] A Discord [permission]{@link https://abal.moe/Eris/reference.html}
	* @arg {Function} [cmd.initialize] A function that runs at creation and is passed the client.
	* @arg {Function} [cmd.destroy] A function that runs at destruction.
	* @arg {Client} bot The client.
	* @arg {Object} config The bot's config settings.
	*/
	constructor(name, prefix, cmd, bot, config) {
		this.name = name;
		this.prefix = prefix;
		this.usage = cmd.usage || "";
		this.desc = cmd.desc || "No description";
		this.help = cmd.help || cmd.desc || this.desc;
		this.task = cmd.task;
		this.aliases = cmd.aliases || [];
		this.cooldown = cmd.cooldown || 0;
		this.hidden = !!cmd.hidden;
		this.ownerOnly = !!cmd.ownerOnly;
		this.guildOnly = !!cmd.guildOnly;
		this.fallback = !!cmd.fallback;
		this.requiredPermission = cmd.requiredPermission || null;
		this.timesUsed = 0;
		this.usersOnCooldown = new Set();
		this.destroyFunction = cmd.destroy;

		if (typeof cmd.initialize === 'function')
			cmd.initialize(bot, config);
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
	execute(bot, msg, suffix, config, settingsManager, logger) {
		if (this.ownerOnly === true && !config.adminIds.includes(msg.author.id)) // ownerOnly check
			return msg.channel.createMessage('Only the owner of this bot can use that command.').then(sentMsg => {
				setTimeout(() => { msg.delete(); sentMsg.delete(); }, 6000);
			});
		if (this.guildOnly === true && msg.channel.guild === undefined) // guildOnly check
			return msg.channel.createMessage('This command can only be used in a server.');
		if (this.requiredPermission !== null && !config.adminIds.includes(msg.author.id) && !msg.channel.permissionsOf(msg.author.id).has(this.requiredPermission)) // requiredPermission check
			return msg.channel.createMessage(`You need the ${this.requiredPermission} permission to use this command.`).then(sentMsg => {
				setTimeout(() => { msg.delete(); sentMsg.delete(); }, 6000);
			});
		if (this.usersOnCooldown.has(msg.author.id)) { // Cooldown check
			return msg.channel.createMessage(`${msg.author.username}, this command can only be used every ${this.cooldown} seconds.`).then(sentMsg => {
				setTimeout(() => { msg.delete(); sentMsg.delete(); }, 6000);
			});
		}

		let result;
		this.timesUsed++;
		commandsProcessed++;
		try {
			result = this.task(bot, msg, suffix, config, settingsManager); //run the command
		} catch (err) {
			logger.error(`${err}\n${err.stack}`, 'COMMAND EXECUTION ERROR');
			if (config.errorMessage)
				msg.channel.createMessage(config.errorMessage);
		}

		if (result === 'wrong usage') {
			msg.channel.createMessage(`${msg.author.username}, try again using the following format:\n**\`${this.prefix}${this.name} ${this.usage}\`**`).then(sentMsg => {
				setTimeout(() => { msg.delete(); sentMsg.delete(); }, 10000);
			});
		} else if (!config.adminIds.includes(msg.author.id)) {
			this.usersOnCooldown.add(msg.author.id);
			setTimeout(() => { //add the user to the cooldown list and remove them after {cooldown} seconds
				this.usersOnCooldown.delete(msg.author.id);
			}, this.cooldown * 1000);
		}
	}

	/** Destroys the command */
	destroy() {
		if (typeof this.destroyFunction === 'function')
			this.destroyFunction();
	}
}

module.exports = Command;
