var AbstractCommand = require('../../../../lib/base/AbstractCommand');

class SetAvatarCommand extends AbstractCommand {
	constructor() {
		super();
	}

	get name() {
		return 'setAvatar';
	}

	handle(message, args) {
		if (message.author.id === '95286900801146880') {
			this.parent.bot.setAvatar(args).then(() => {
				this.sendMessage(message, 'Avatar updated');
			}).catch(error => {
				this.sendMessage(message, error);
			});
		}
	}
}

module.exports = SetAvatarCommand;
