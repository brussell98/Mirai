var AbstractCommand = require('../../../../lib/base/AbstractCommand');

class PingCommand extends AbstractCommand {
	constructor() {
		super();
	}

	get name() {
		return 'ping';
	}

	handle(message) {
		this.sendMessage(message, 'pong!');
	}
}

module.exports = PingCommand;
