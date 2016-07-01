module.exports = function(bot, settingsManager, guild, member) {
	let welcomeMessage = settingsManager.getWelcome(guild.id, member.user.username, guild.name);
	if (welcomeMessage !== null) {
		if (welcomeMessage[0] === 'DM') {
			bot.getDMChannel(member.user.id).then(chan => {
				bot.createMessage(chan.id, welcomeMessage[1]);
			});
		} else
			bot.createMessage(welcomeMessage[0], welcomeMessage[1]);
		console.log(`${cDebug(' SERVER NEW MEMBER ')} Welcomed ${member.user.username} to ${guild.name}`);
	}

	let joinEventChannel = settingsManager.getEventSetting(guild.id, 'memberjoined');
	if (joinEventChannel !== null) {
		bot.createMessage(joinEventChannel, `\`[${new Date().toUTCString()}]\` Member Joined: ${member.user.username}`);
		console.log(`${cDebug(' EVENT NOTIFICATON ')} memberjoined on ${guild.name}: ${member.user.username}`);
	}
}
