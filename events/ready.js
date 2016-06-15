module.exports = function(bot, config, games, comma) {
	//bot.setPlayingGame(games[~Math.random() * games.length]);
	bot.setPlayingGame('BrussellBot v3');
	console.log(`${cGreen('READY')} S:${comma(bot.servers.length)} U:${comma(bot.users.length)} AVG:${bot.users.length / bot.servers.length}`);
}
