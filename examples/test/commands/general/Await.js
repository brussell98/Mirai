var AbstractCommand = require('../../../../lib/base/AbstractCommand');

class AwaitCommand extends AbstractCommand {
	constructor() {
		super();
	}

	get name() {
		return 'await';
	}

	get description() {
		return 'Test of awaitMessage';
	}

	handle(message, args) {
		this.sendMessage(message, 'Say the args in caps in this channel, time limit: 5 seconds');
		this.awaitMessage(msg => msg.channel.id === message.channel.id && msg.content === args.toUpperCase(), msg => {
			this.sendMessage(msg, 'Recieved');
		}, 5000);
	}
}

module.exports = AwaitCommand;
