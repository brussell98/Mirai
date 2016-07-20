module.exports = function(bot, _settingsManager, config, guild) {
	console.log(`${cGreen(' JOINED GUILD: ')}${guild.name} ${cGreen('owned by')} ${guild.members.get(guild.ownerID).user.username}`);
	if (config.bannedServerIds.includes(guild.id)) {
		console.log(`${cRed(' BANNED GUILD: ')}left ${guild.name}`);
		bot.leaveGuild(guild.id);
	} else {
		bot.createMessage(guild.defaultChannel.id, "Hi I'm Mirai!\nYou can find my commands at http://brussell98.github.io/bot/index.html or by doing ]help and }help\nYou can get general information about me by doing ]about");
	}
}
