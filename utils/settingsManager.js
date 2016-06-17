var reload = require('require-reload')(require),
	utils = reload('./utils.js');

var genericSettings = reload('../db/genericSettings.json'),
	commandSettings = reload('../db/commandSettings.json'),
	updateGeneric = false,
	updateCommand = false;

setInterval(() => {
	if (updateGeneric) {
		utils.safeSave('db/genericSettings', '.json', JSON.stringify(genericSettings));
		updateGeneric = false;
	}
	if (updateCommand) {
		utils.safeSave('db/commandSettings', '.json', JSON.stringify(commandSettings));
		updateCommand = false;
	}
}, 20000);

function setWelcome(serverId, channelId, message) {
	if (!genericSettings.hasOwnProperty(serverId)) {
		genericSettings[serverId] = {};
	}
	if (!message && genericSettings[serverId].hasOwnProperty('welcome')) { //If disabling message and a message is set.
		delete genericSettings[serverId].welcome;
		updateGeneric = true;
	} else if (message && (genericSettings[serverId].welcome.message != message || genericSettings[serverId].welcome.channelId != channelId)) {
		//If setting a message and a setting is changed.
		genericSettings[serverId].welcome.message = message;
		genericSettings[serverId].welcome.channelId = channelId;
		updateGeneric = true;
	}
}

function getWelcome(serverId, username, serverName) {
	if (genericSettings.hasOwnProperty(serverId) && genericSettings[serverId].welcome.hasOwnProperty('message'))
		return genericSettings[serverId].welcome.message.replace(/\$\{USER\}/gi, username).replace(/\$\{SERVER\}/gi, serverName); //replace with names
	return false;
}

module.exports = {
	setWelcome,
	getWelcome
};
