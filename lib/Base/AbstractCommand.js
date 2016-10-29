class AbstractCommand {
	constructor() {
		if (this.constructor === AbstractCommand)
			throw new Error("Can't instantiate an abstract class!");
	}

	load(parent) {
		this.client = parent.bot.client;
		this.parent = parent;
		return Promise.resolve(this);
	}

	destroy() {
		this.client = undefined;
		this.parent = undefined;
		return Promise.resolve();
	}

	send(message, content, options = {}) {
		if (!message || !content)
			return;

		if (options.deleteTrigger && message.channel.guild && message.channel.permissionsOf(this.client.user.id).has('manageMessages'))
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
}

module.exports = AbstractCommand;
