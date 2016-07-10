module.exports = function(bot, settingsManager, _config, guild, user) {
	let unbanEventChannel = settingsManager.getEventSetting(guild.id, 'userunbanned');
	if (unbanEventChannel !== null)
		bot.createMessage(unbanEventChannel, `\`[${new Date().toUTCString()}]\` **User Unbanned:** ${user.username}`);
}
