var reload = require('require-reload')(require),
	settingsManager = reload('../utils/settingsManager.js');

module.exports = function(bot, server, user) {
	let welcomeMessage = settingsManager.getWelcome(server.id, user.username, server.name);
	if (welcomeMessage !== false) {
		bot.sendMessage(welcomeMessage[0], welcomeMessage[1]);
		console.log(`${cDebug(' SERVER NEW MEMBER ')} Welcomed ${user.username} to ${server.name}`);
	}
}
