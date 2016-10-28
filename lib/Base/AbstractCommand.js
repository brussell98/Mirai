class AbstractCommand {
	constructor() {
		if (this.constructor === AbstractCommand)
			throw new Error("Can't instantiate an abstract class!");
	}

	load(parent) {
		this.parent = parent;
		return Promise.resolve();
	}

	destroy() {
		this.parent = undefined;
		return Promise.resolve();
	}

	send(message, content, options = {}) {
		if (!message || !content)
			return;

		if (options.deleteTrigger)
			message.delete().catch(error => {
				// log
			});

		message.channel.createMessage(content.substr(0, 2000)).then(msg => {
			if (options.deleteAfter) {
				setTimeout(() => {
					msg.delete().catch(error => {
						// log this should be very rare
					});
				}, options.deleteAfter * 1000);
			}
		}).catch(error => {
			// log
		});
	}
}

module.exports = AbstractCommand;
