var reload = require('require-reload'),
	_Logger = reload('../utils/Logger.js'),
	logger;

module.exports = function(bot, _settingsManager, config, guild) {
	if (logger === undefined)
		logger = new _Logger(config.logTimestamp);
	logger.logWithHeader('JOINED GUILD', 'bgGreen', 'black', `${guild.name} owned by ${guild.members.get(guild.ownerID).user.username}`);
	if (config.bannedGuildIds.includes(guild.id)) {
		logger.logWithHeader('LEFT BANNED GUILD', 'bgRed', 'black', guild.name);
		bot.leaveGuild(guild.id);
	} else {
		bot.createMessage(guild.defaultChannel.id, "Hi I'm Mirai!\nYou can find my commands at http://brussell98.github.io/bot/index.html or by doing ]help and }help\nYou can get general information about me by doing ]about");
	}
}
