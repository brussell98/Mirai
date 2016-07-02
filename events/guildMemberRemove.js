module.exports = function(bot, settingsManager, guild, member) {
	let leaveEventChannel = settingsManager.getEventSetting(guild.id, 'memberleft');
	if (leaveEventChannel !== null)
		bot.createMessage(leaveEventChannel, `\`[${new Date().toUTCString()}]\` **Member Left:** ${member.user.username}`);
}
