var reload = require('require-reload'),
	formatTime = reload('../../utils/utils.js').formatTime,
	version = reload('../../package.json').version,
	Nf = new Intl.NumberFormat('en-US');

module.exports = {
	desc: "Displays statistics about the bot.",
	hidden: true,
	guildOnly: true,
	cooldown: 10,
	requiredPermission: 'manageGuild',
	task(bot, msg) {
		let totalCommandUsage = commandsProcessed + cleverbotTimesUsed;
		bot.createMessage(msg.channel.id, `\`\`\`md
[Mirai Statistics]:
[Uptime](${formatTime(bot.uptime)})
[Memory Usage](${Math.round(process.memoryUsage().rss / 1024 / 1000)}MB)
[Version](MiraiBot ${version})
[Shards](${bot.shards.size})

# Available to:
[Guilds](${Nf.format(bot.guilds.size)})
[Channels](${Nf.format(Object.keys(bot.channelGuildMap).length)})
[Private Channels](${Nf.format(bot.privateChannels.size)})
[Users](${Nf.format(bot.users.size)})
[Average Users/Guild](${Nf.format((bot.users.size / bot.guilds.size).toFixed(2))})

# Command Usage:
[Total | Commands | Cleverbot](${Nf.format(totalCommandUsage)} | ${Nf.format(commandsProcessed)} | ${Nf.format(cleverbotTimesUsed)})
[Average](${(totalCommandUsage / (bot.uptime / (1000 * 60))).toFixed(2)}/min)\`\`\``);
	}
};
