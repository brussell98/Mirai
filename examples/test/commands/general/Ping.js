var AbstractCommand = require('../../../../lib/base/AbstractCommand');

class PingCommand extends AbstractCommand {
	constructor() {
		super();
	}

	get name() {
		return 'ping';
	}

	handle(message) {
		if (this.userOnCooldown(message.author.id, 3000))
			return this.sendMessage(message, 'You can only use this command every 3 seconds.', { deleteAfter: 3000, deleteTrigger: true });
		this.sendMessage(message, 'pong in ??ms').then(msg => {
			msg.edit(`pong in ${(msg.timestamp - message.timestamp).toLocaleString()}ms`);
		});
	}
}

module.exports = PingCommand;
