module.exports = function(bot, config, games, utils) {
	//bot.editGame({name: games[~Math.random() * games.length]});
	bot.editGame({name: 'BrussellBot v3'});
	console.log(`${cGreen('READY')} S:${utils.comma(bot.guilds.size)} U:${utils.comma(bot.users.size)} AVG:${utils.comma((bot.users.size / bot.guilds.size).toFixed(2))}`);
}
