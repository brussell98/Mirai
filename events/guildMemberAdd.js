module.exports = function(bot, settingsManager, _config, guild, member) {
	let welcomeMessage = settingsManager.getWelcome(guild, member);
	if (welcomeMessage !== null) {
		if (welcomeMessage[0] === 'DM') {
			bot.getDMChannel(member.user.id).then(chan => {
				bot.createMessage(chan.id, welcomeMessage[1]);
			});
		} else
			bot.createMessage(welcomeMessage[0], welcomeMessage[1]);
	}

	let joinEventChannel = settingsManager.getEventSetting(guild.id, 'memberjoined');
	if (joinEventChannel !== null)
		bot.createMessage(joinEventChannel, `\`[${new Date().toUTCString()}]\` **Member Joined:** ${member.user.username}`);
}
