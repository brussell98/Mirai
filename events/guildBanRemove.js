module.exports = function(bot, settingsManager, guild, user) {
	let unbanEventChannel = settingsManager.getEventSetting(guild.id, 'userunbanned');
	if (unbanEventChannel !== null) {
		bot.createMessage(unbanEventChannel, `\`[${new Date().toUTCString()}]\` User Unbanned: ${user.username}`);
		console.log(`${cDebug(' EVENT NOTIFICATON ')} userunbanned on ${guild.name}: ${user.username}`);
	}
}
