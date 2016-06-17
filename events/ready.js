module.exports = function(bot, config, games, utils) {
	//bot.setPlayingGame(games[~Math.random() * games.length]);
	bot.setPlayingGame('BrussellBot v3');
	console.log(`${cGreen('READY')} S:${utils.comma(bot.servers.length)} U:${utils.comma(bot.users.length)} AVG:${utils.comma((bot.users.length / bot.servers.length).toFixed(2))}`);
}
