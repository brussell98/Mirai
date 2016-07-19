var reload = require('require-reload'),
	games = reload('../../special/games.json');

module.exports = {
	desc: "Change the bot's status.",
	help: "Start with a valid game object `{\"name\": \"\", \"type\": 0, \"url\": \"\"}` or game `with you`. Avalible flags are:\n\t-f   Force the game to stay the same.\n\t-r   Return to random game cycling, ignoring the input.",
	usage: "<status object | status> [flag]",
	hidden: true,
	ownerOnly: true,
	task(bot, msg, suffix, config) {
		if (!suffix)
			return bot.createMessage(msg.channel.id, 'No suffix provided');
		if (suffix.endsWith('-r'))
			return bot.editGame({name: games[~~(Math.random() * games.length)]});
		if (suffix.endsWith('-f'))
			config.cycleGames = false;
		if (suffix.startsWith('{'))
			bot.editGame(JSON.parse(suffix.replace(/ *\-f$/, '')));
		else
			bot.editGame({name: suffix.replace(/ *\-f$/, '')});
	}
};
