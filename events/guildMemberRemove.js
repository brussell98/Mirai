module.exports = function(bot, settingsManager, _config, guild, member) {
	let leaveEventChannel = settingsManager.getEventSetting(guild.id, 'memberleft');
	if (leaveEventChannel !== null)
		bot.createMessage(leaveEventChannel, `\`[${new Date().toLocaleString()}]\` **Member Left:** ${member.user.username}`);
}
