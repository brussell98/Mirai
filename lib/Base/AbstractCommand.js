/**
 * A command managed by a CommandPlugin
 * @abstract
 */
class AbstractCommand {
	/**
	 * Creates a new AbstractCommand
	 * @abstract
	 */
	constructor() {
		if (this.constructor === AbstractCommand)
			throw new Error("Can't instantiate an abstract class!");
	}

	/**
	 * The name of the command
	 * @type {String}
	 * @abstract
	 */
	get name() {
		throw new Error('name must be overwritten');
	}

	/**
	 * A description of the command
	 * @type {String}
	 * @abstract
	 */
	get description() {
		return '';
	}

	/**
	 * Loads the command
	 * @param {AbstractCommandPlugin} parent The plugin managing this command
	 * @returns {Promise} Resolves with `this`
	 */
	load(parent) {
		return new Promise(resolve => {
			this.parent = parent;
			resolve(this);
		});
	}

	/**
	 * Destroys/unloads the command
	 * @returns {Promise} Resolves with no value
	 */
	destroy() {
		return new Promise(resolve => {
			this.parent = undefined;
			resolve();
		});
	}

	/**
	 * Send a message to discord
	 * @param {Message} message The message to respond to
	 * @param {String|Object} content The content to be passed to Eris.Client#createMessage
	 * @param {Object} [options] Options for sending the message
	 * @param {Boolean} [options.deleteTrigger=false] Delete the message that triggered the command
	 * @param {Number} [options.deleteAfter=0] Delete the created message after this many milliseconds
	 * @param {Boolean} [options.DM=false] Send in a Direct Message
	 * @param {Object} [options.file] The file to be sent with the message. Format as shown in the Eris docs
	 * @param {Boolean} [options.paginate] Split the message at 2000 charcter intervals. Used to send log messages that would normally fail
	 * @see {@link http://eris.tachibana.erendale.abal.moe/Eris/docs/Client#function-createMessage|Eris.Client#createMessage}
	 */
	sendMessage(message, content, options = {}) {
		if (!message || !content)
			return;

		if (options.deleteTrigger && message.channel.guild && message.channel.permissionsOf(this.parent.bot.user.id).has('manageMessages'))
			message.delete().catch(error => { this.parent.logger.warn('Error deleting trigger:', error); });

		if (typeof content !== 'object')
			content = { content };

		(options.DM ? message.author.getDMChannel() : Promise.resolve(message.channel)).then(channel => {
			if (!options.paginate)
				return this._sendMessage(channel, content, options);
			let i = 0;
			while (i < content.content.length) {
				let _content = JSON.parse(JSON.stringify(content)); // Clone
				_content.content = content.content.slice(i, i + 2000);
				this._sendMessage(channel, _content, options);
				i += 2000;
				options.file = undefined;
			}
		}).catch(error => { this.parent.logger.warn('Error getting DM channel:', error); });
	}

	/**
	 * @private
	 * @param {Channel} channel The channel to create the message in
	 * @param {String|Object} content The content to be passed to Eris.Client#createMessage
	 * @param {Object} [options] Options for sending the message
	 */
	_sendMessage(channel, content, options) {
		channel.createMessage(content, options.file).then(msg => {
			if (options.deleteAfter > 0) {
				setTimeout(() => {
					msg.delete().catch(error => { this.parent.logger.warn('Error deleting message (deleteAfter): ', error); });
				}, options.deleteAfter);
			}
		}).catch(error => { this.parent.logger.warn('Error creating message:', error); });
	}

	/**
	 * Await a message, the trigger a function
	 * @param {Function} trigger A funcion that takes a Message and returns a Boolean
	 * @param {Function} action A function to be executed when `trigger` returns true
	 * @param {Number} [timeout] Delete the await after this many milliseconds
	 * @returns {Number} The unique id of the await
	 */
	awaitMessage(trigger, action, timeout) {
		return this.parent.bot.chatHandler.awaitMessage(trigger, action, timeout);
	}

	/**
	 * Check if a user is on cooldown
	 * @param {String} userID The id of the user to check for
	 * @param {Number} waitTime If not on cooldown, put them on cooldown for this many milliseconds
	 * @returns {Boolean} If the user is still on cooldown
	 */
	userOnCooldown(userID, waitTime) {
		if (!this.cooldownUsers)
			this.cooldownUsers = new Set();

		if (this.cooldownUsers.has(userID))
			return true;

		this.cooldownUsers.add(userID);
		setTimeout(() => {
			this.cooldownUsers.delete(userID);
		}, waitTime);
		return false;
	}
}

module.exports = AbstractCommand;
