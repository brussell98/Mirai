var Nf = new Intl.NumberFormat('en-US'),
	reload = require('require-reload'),
	_Logger = reload('../utils/Logger.js'),
	logger;

module.exports = function(bot, config, games, utils) {
	if (logger === undefined)
		logger = new _Logger(config.logTimestamp);
	utils.checkForUpdates();
	bot.shards.forEach(shard => {
		let name = games[~~(Math.random() * games.length)];
		shard.editStatus(null, {name});
	});
	logger.logWithHeader('READY', 'bgGreen', 'black', `S:${Nf.format(bot.guilds.size)} U:${Nf.format(bot.users.size)} AVG:${Nf.format((bot.users.size / bot.guilds.size).toFixed(2))}`);
}
