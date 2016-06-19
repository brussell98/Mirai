var reload = require('require-reload')(require),
	settingsManager = reload('../../utils/settingsManager.js');

//Validates the message and updates the setting.
function updateWelcome(bot, msg, args) {
	if (args.toLowerCase() === 'disable') {
		settingsManager.setWelcome(msg.server.id);
		bot.sendMessage(msg, '⚙ Welcome message disabled');
	} else {
		let newSettings = args.match(/<#([0-9]+)>(.*)/);
		if (newSettings === null)
			bot.sendMessage(msg, 'Please format your message in this format: `welcome <#channel> <message>`');
		else if (!newSettings[1])
			bot.sendMessage(msg, 'Please specify a channel before the welcome message.');
		else if (!newSettings[2])
			bot.sendMessage(msg, 'Please specify a welcome message.');
		else if (!msg.server.channels.has('id', newSettings[1]))
			bot.sendMessage(msg, "That channel doesn't seem to exist.");
		else if (newSettings[2].length >= 1900)
			bot.sendMessage(msg, "Sorry your welcome message needs to be under 1,900 characters.");
		else {
			settingsManager.setWelcome(msg.server.id, newSettings[1], newSettings[2]);
			bot.sendMessage(msg, "⚙ Settings updated");
		}
	}
}

module.exports = {
	desc: "Adjust a server's settings.",
	help: "Modify how the bot works on a server.\n\t__welcome__: Set the channel and message to be displayed to new members `welcome #general Welcome ${USER} to ${SERVER}`.",
	usage: "Usage at <http://brussell98.github.io/bot/serversettings.html>",
	aliases: ['set', 'config'],
	cooldown: 3,
	task(bot, msg, suffix, config) {
		if (msg.channel.isPrivate)
			bot.sendMessage(msg, 'You have to do this in a server.');
		else if (!msg.channel.permissionsOf(msg.author).hasPermission("manageServer") && !config.adminIds.includes(msg.author.id))
			bot.sendMessage(msg, 'You need the `Manage Server` permission to use this.');
		else if (!suffix)
			return 'wrong usage';
		else if (suffix.startsWith('welcome'))
			updateWelcome(bot, msg, suffix.substr(7).trim());
	}
};
