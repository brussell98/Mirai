var AbstractCommand = require('../../../../lib/base/AbstractCommand');

class ResolveCommand extends AbstractCommand {
	constructor() {
		super();
	}

	get name() {
		return 'resolve';
	}

	handle(message, args) {
		let member = this.parent.bot.findMember(args, message.channel.guild.members);
		if (member === null)
			return this.sendMessage(message, "I couldn't find anyone with that name in this guild");
		this.sendMessage(message, 'I found a member with the name ' + (member.nick || member.user.username));
	}
}

module.exports = ResolveCommand;
