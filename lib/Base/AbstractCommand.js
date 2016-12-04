class AbstractCommand {
	constructor() {
		if (this.constructor === AbstractCommand)
			throw new Error("Can't instantiate an abstract class!");
	}

	get name() {
		throw new Error('name must be overwritten');
	}

	load(parent) {
		this.parent = parent;
		return Promise.resolve(this);
	}

	destroy() {
		this.parent = undefined;
		return Promise.resolve();
	}

	sendMessage(message, content, options = {}) {
		if (!message || !content)
			return;

		if (options.deleteTrigger && message.channel.guild && message.channel.permissionsOf(this.parent.bot.user.id).has('manageMessages'))
			message.delete().catch(error => this.parent.logger.warn(error)); // TODO

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
		}).catch(error => this.parent.logger.warn(error)); // TODO
	}

	_sendMessage(channel, content, options) {
		channel.createMessage(content, options.file).then(msg => {
			if (options.deleteAfter) {
				setTimeout(() => {
					msg.delete().catch(error => this.parent.logger.warn(error)); // TODO
				}, options.deleteAfter);
			}
		}).catch(error => this.parent.logger.warn(error)); // TODO
	}

	awaitMessage(trigger, action, timeout) {
		return this.parent.bot.chatHandler.awaitMessage(trigger, action, timeout);
	}

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
