module.exports = {
	desc: "The link to add me to a server.",
	aliases: ['oauth'],
	cooldown: 5,
	task(bot, msg, _, config) {
		if (config.inviteLink)
			bot.sendMessage(msg, `Use this to add me to a server: ${config.inviteLink}\nMake sure you are logged in`);
		else
			bot.sendMessage(msg, 'No invite link defined');
	}
};
