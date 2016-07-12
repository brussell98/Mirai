module.exports = function(bot, config, games, utils) {
	utils.checkForUpdates();
	bot.shards.forEach(shard => {
		shard.editGame({name: games[~~(Math.random() * games.length)]});
	});
	console.log(`${cGreen('READY')} S:${utils.comma(bot.guilds.size)} U:${utils.comma(bot.users.size)} AVG:${utils.comma((bot.users.size / bot.guilds.size).toFixed(2))}`);
}
