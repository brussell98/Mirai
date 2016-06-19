var reload = require('require-reload')(require),
	utils = reload('./utils.js');

genericSettings = reload('../db/genericSettings.json');
commandSettings = reload('../db/commandSettings.json');

var updateGeneric = false,
	updateCommand = false;

setInterval(() => {
	if (updateGeneric === true) {
		utils.safeSave('db/genericSettings', '.json', JSON.stringify(genericSettings));
		updateGeneric = false;
	}
	if (updateCommand === true) {
		utils.safeSave('db/commandSettings', '.json', JSON.stringify(commandSettings));
		updateCommand = false;
	}
}, 20000);

//Set a server's welcome message.
function setWelcome(serverId, channelId, message) {
	if (!genericSettings.hasOwnProperty(serverId))
		genericSettings[serverId] = {};
	if (!genericSettings[serverId].hasOwnProperty('welcome')) {
		if (message) { //Setting message and enabling
			genericSettings[serverId].welcome = {message, channelId};
			console.log(`${cDebug(' SETTINGS MANAGER ')} Updated welcome message for ${serverId}`);
			updateGeneric = true;
		}
	} else {
		if (message && (genericSettings[serverId].welcome.message != message || genericSettings[serverId].welcome.channelId != channelId)) {
			genericSettings[serverId].welcome.message = message; //Changing message
			genericSettings[serverId].welcome.channelId = channelId;
			console.log(`${cDebug(' SETTINGS MANAGER ')} Updated welcome message for ${serverId}`);
			updateGeneric = true;
		} else if (!message) { //disabling message that exists
			console.log(`${cDebug(' SETTINGS MANAGER ')} Disabled welcome message for ${serverId}`);
			delete genericSettings[serverId].welcome;
			updateGeneric = true;
		}
	}
}

//Returns an array containing [channelid, message] or false
function getWelcome(serverId, username, serverName) {
	if (genericSettings.hasOwnProperty(serverId) && genericSettings[serverId].hasOwnProperty('welcome'))
		return [genericSettings[serverId].welcome.channelId,
				genericSettings[serverId].welcome.message.replace(/\$\{USER\}/gi, username).replace(/\$\{SERVER\}/gi, serverName)]; //replace with names
	return false;
}

module.exports = {
	setWelcome,
	getWelcome
};
