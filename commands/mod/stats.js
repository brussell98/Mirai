var reload = require('require-reload'),
	utils = reload('../../utils/utils.js'),
	version = reload('../../package.json').version;

module.exports = {
	desc: "Displays statistics about the bot.",
	hidden: true,
	task(bot, msg, suffix, config) {
		if (config.adminIds.includes(msg.author.id)) {
			let totalCommandUsage = commandsProcessed + cleverbotTimesUsed;
			bot.createMessage(msg.channel.id, `\`\`\`md
[Mirai Statistics]:
[Uptime](${utils.formatTime(bot.uptime)})
[Memory Usage](${Math.round(process.memoryUsage().rss / 1024 / 1000)}MB)
[Version](MiraiBot ${version})

# Avalible to:
[Guilds](${utils.comma(bot.guilds.size)})
[Channels](${utils.comma(Object.keys(bot.channelGuildMap).length)})
[Private Channels](${utils.comma(bot.privateChannels.size)})
[Users](${utils.comma(bot.users.size)})
[Average Users/Guild](${utils.comma((bot.users.size / bot.guilds.size).toFixed(2))})

# Command Usage:
[Total | Commands | Cleverbot](${utils.comma(totalCommandUsage)} | ${utils.comma(commandsProcessed)} | ${utils.comma(cleverbotTimesUsed)})
[Average](${(totalCommandUsage / (bot.uptime / (1000 * 60))).toFixed(2)}/min)\`\`\``);
		} else
			bot.createMessage(msg.channel.id, "Only the owner of Mirai is allowed to use this command.");
	}
};
