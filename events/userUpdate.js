module.exports = function(bot, settingsManager, _config, user, oldUser) {
	if (oldUser && user.username !== oldUser.username) {
		bot.guilds.forEach(guild => {
			if (guild.members.has(user.id)) {
				let nameEventChannel = settingsManager.getEventSetting(guild.id, 'namechanged');
				if (nameEventChannel !== null)
					bot.createMessage(nameEventChannel, `\`[${new Date().toLocaleString()}]\` **Name Change:** ${oldUser.username} \`\`is now\`\` ${user.username}`);
			}
		});
	}
}
