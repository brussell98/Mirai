var reload = require('require-reload'),
	setAvatar = reload('../../utils/utils.js').setAvatar;

module.exports = {
	desc: "Set the bot's avatar from a URL.",
	usage: "<URL>",
	hidden: true,
	ownerOnly: true,
	task(bot, msg, suffix) {
		setAvatar(bot, suffix)
			.then(() => {
				bot.createMessage(msg.channel.id, 'Avatar updated');
			}).catch(error => {
				bot.createMessage(msg.channel.id, error);
			});
	}
};
