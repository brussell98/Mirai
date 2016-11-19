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

		if (options.tts)
			content = { content, tts: true };

		(options.DM ? message.author.getDMChannel() : Promise.resolve(message.channel)).then(channel => {
			channel.createMessage(content.substr(0, 2000), options.file).then(msg => {
				if (options.deleteAfter) {
					setTimeout(() => {
						msg.delete().catch(error => this.parent.logger.warn(error)); // TODO
					}, options.deleteAfter * 1000);
				}
			}).catch(error => this.parent.logger.warn(error)); // TODO
		});
	}

	awaitMessage(trigger, action, timeout) {
		this.parent.bot.chatHandler.awaitMessage(trigger, action, timeout);
	}
}

module.exports = AbstractCommand;
