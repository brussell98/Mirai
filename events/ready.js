module.exports = function(bot, config, games) {
	//bot.setPlayingGame(games[~Math.random() * games.length]);
	bot.setPlayingGame('BrussellBot v3');
	console.log(`${cGreen('READY')} S:${bot.servers.length} U:${bot.users.length} AVG:${bot.users.length / bot.servers.length}`);
}
