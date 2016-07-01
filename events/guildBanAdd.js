module.exports = function(bot, settingsManager, guild, user) {
	let banEventChannel = settingsManager.getEventSetting(guild.id, 'userbanned');
	if (banEventChannel !== null) {
		bot.createMessage(banEventChannel, `\`[${new Date().toUTCString()}]\` User Banned: ${user.username}`);
		console.log(`${cDebug(' EVENT NOTIFICATON ')} userbanned on ${guild.name}: ${user.username}`);
	}
}
