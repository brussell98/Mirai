module.exports = {
	desc: "The link to add me to a server.",
	aliases: ['oauth'],
	cooldown: 5,
	task(bot, msg, _, config) {
		if (config.inviteLink)
			bot.createMessage(msg.channel.id, `Use this to add me to a server: ${config.inviteLink}\nMake sure you are logged in`);
		else
			bot.createMessage(msg.channel.id, 'No invite link defined');
	}
};
