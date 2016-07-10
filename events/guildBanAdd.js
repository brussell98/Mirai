module.exports = function(bot, settingsManager, _config, guild, user) {
	let banEventChannel = settingsManager.getEventSetting(guild.id, 'userbanned');
	if (banEventChannel !== null)
		bot.createMessage(banEventChannel, `\`[${new Date().toUTCString()}]\` **User Banned:** ${user.username}`);
}
